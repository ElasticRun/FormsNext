import frappe
import json
from frappe.utils.background_jobs import enqueue
from frappe import sendmail

@frappe.whitelist()
def get_active_surveys():
    active_surveys = frappe.get_all(
        "User Feedback", 
        filters = [
            ["User Feedback", "user", "=", frappe.session.user]
        ],
        fields = ["name", "survey", "workflow_state"])
    return active_surveys


@frappe.whitelist()
def submit_section(user_feedback_name, question_response_pairs, scores, current_section, current_section_name):
    current_section = int(current_section)
    question_response_pairs = json.loads(question_response_pairs)
    scores = json.loads(scores)
    for i, qtn in enumerate(question_response_pairs):
        resp = question_response_pairs[qtn]
        existing_qp_pair = frappe.get_all(
            "User Response", 
            filters = [
                ["User Response", "parent", "=", user_feedback_name],
                ["User Response", "question", "=", qtn]
            ],
            fields = ["name", "question", "response"]
        )
        if existing_qp_pair[0]["response"] == "" or existing_qp_pair[0]["response"] is None:
            for r in resp:
                r["version"] = 0    
            resp_link = frappe.get_doc({
                "doctype": "Response Value Link",
                "response_values": resp,
                "latest_version": 0,
                "score": scores[i]
            }).insert()
            qp_pair_doc = frappe.get_doc("User Response", existing_qp_pair[0]["name"])
            qp_pair_doc.response = resp_link.name
            qp_pair_doc.save()
            action = "Created Responses"
        else:
            resp_link = frappe.get_doc("Response Value Link", existing_qp_pair[0]["response"])
            current_version = resp_link.latest_version
            for r in resp:
                r["version"] = current_version + 1
                resp_link.append('response_values', r)
            resp_link.latest_version = current_version + 1
            resp_link.score = scores[i]
            resp_link.save()    
            action = "Updated Responses"

    next_section, end_survey = calculate_next_section(current_section, current_section_name, question_response_pairs)

    user_feedback_doc = frappe.get_doc("User Feedback", user_feedback_name)
        
    if current_section == 0:
        user_feedback_doc.workflow_state = "Partially Completed"
        
    if end_survey:
        user_feedback_doc.workflow_state = "Completed"
        survey_doc = frappe.get_doc("Survey", user_feedback_doc.survey)
        if survey_doc.send_email_alert:
            recepients = [r.email for r in survey_doc.email_recepients]
            email_args = {
                "recipients": recepients,
                "message": """
                    A response for the {0} has been recieved from {1}. Please go to the following link for results.
                    https://surveys.elasticrun.in/desk#query-report/User Latest Feedback
                """.format(survey_doc.name, frappe.session.user),
                "subject": 'Survey {0} Response from {1}'.format(survey_doc.name, frappe.session.user),
                "reference_doctype": "User Feedback",
                "reference_name": user_feedback_name
                }
            enqueue(method=frappe.sendmail, queue='short', timeout=300, **email_args)
		
    user_feedback_doc.current_section = next_section
    user_feedback_doc.save()

    return next_section


def calculate_next_section(current_section, current_section_name, question_response_pairs):
    section_doc = frappe.get_doc("Section", current_section_name)
    if section_doc.conditional_question == "" or section_doc.conditional_question is None:
        if section_doc.default_next_section == "" or section_doc.default_next_section is None:
            next_section = None
        else:
            next_section = frappe.get_doc("Survey Section", section_doc.default_next_section).idx - 1
    else:
        submitted_response = question_response_pairs[section_doc.conditional_question][0]["value"]
        if section_doc.value_data_type == "String":
            expected_reponse = section_doc.value
        elif section_doc.value_data_type == "Int":
            expected_reponse = int(section_doc.value)
        elif section_doc.value_data_type == "Float":
            expected_reponse = float(section_doc.value)
        if submitted_response == expected_reponse:
            next_section_name = section_doc.next_section
            next_section = frappe.get_doc("Survey Section", next_section_name).idx - 1
        else:
            if section_doc.default_next_section != "":
                next_section = frappe.get_doc("Survey Section", section_doc.default_next_section).idx - 1
            else:
                next_section = None
    
    return next_section, section_doc.end_survey