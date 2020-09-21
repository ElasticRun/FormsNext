# -*- coding: utf-8 -*-
# Copyright (c) 2020, ElasticRun and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.exceptions import DuplicateEntryError
from frappe.utils.background_jobs import enqueue

class Survey(Document):
	def on_update_after_submit(self):
		if self.workflow_state == "Published":
			frappe.db.commit()
			enqueue(create_missing_feedbacks, self=self)

@frappe.whitelist()
def create_feedback(survey_id):
	survey_doc = frappe.get_doc("Survey", survey_id)
	survey_doc.on_update_after_submit()
	return True


def create_missing_feedbacks(self):
	survey_users = []
	for role_doc in self.enabled_for_roles:
		role_users = frappe.db.sql("""
			SELECT 
				tin.parent
			FROM
			(
				SELECT 
					`tabHas Role`.parent,
					tuf.name 
				FROM `tabHas Role`
				LEFT JOIN 
				(
					SELECT
						user,
						name,
						survey
					FROM `tabUser Feedback`
					WHERE survey = '{1}'
				) tuf
				ON tuf.user = `tabHas Role`.parent
				WHERE `tabHas Role`.parenttype  = 'User'
				AND `tabHas Role`.role = '{0}'
			) tin
			WHERE tin.name IS NULL
		""".format(role_doc.role, self.name), as_list = 1)
		survey_users.extend(sum(role_users, []))
	for user_doc in self.enabled_for_users:
		survey_users.append(user_doc.user)
	survey_users = list(set(survey_users))
	user_responses = []
	for section in self.sections:
		section_doc = frappe.get_doc("Section", section.section_link)
		for question in section_doc.questions:
			user_responses.append({
				"question": question.name
			})

	for user in survey_users:
		try:
			frappe.get_doc({
				"doctype": "User Feedback",
				"user": user,
				"survey": self.name,
				"user_responses": user_responses,
				"owner": user
			}).insert()
			if self.send_publish_email_alert:
				user_doc = frappe.get_doc('User', user)
				recepients = [user]
				if self.publish_email_content == 'Default':
					message = """
							Hi {first_name},
							{survey_name} Survey has been assigned to you. Please fill it at the earliest. 
							To fill go to the following link.
							https://{callback_url}/desk#survey
						""".format(first_name = user_doc.first_name, survey_name = self.name, callback_url = self.email_message_callback_url)
				elif self.publish_email_content == 'Description':
					message = """
						Hi {first_name},
						{description}
					""".format(first_name = user_doc.first_name, description = self.description)

				email_args = {
					"recipients": recepients,
					"message": message,
					"subject": self.name,
					"reference_doctype": "Survey",
                	"reference_name": self.name
                }
				enqueue(method=frappe.sendmail, queue='short', timeout=300, **email_args)

		except DuplicateEntryError:
			pass
