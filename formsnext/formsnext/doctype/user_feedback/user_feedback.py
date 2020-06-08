# -*- coding: utf-8 -*-
# Copyright (c) 2020, ElasticRun and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
import pandas as pd
from frappe.utils.background_jobs import enqueue

class UserFeedback(Document):
	pass

@frappe.whitelist()
def get_results(user_feedback):
	get_user_responses = """
		SELECT tq.name, tq.question_string, tq.feedback_if_incorrect, trl.score, GROUP_CONCAT(trv.value) AS responses
		FROM
		`tabUser Feedback` tuf
		INNER JOIN `tabUser Response` tur
		ON tur.parent = tuf.name
		INNER JOIN `tabSection Item` tq
		ON tq.name = tur.question
		INNER JOIN `tabResponse Value Link` trl
		ON trl.name = tur.response
		INNER JOIN `tabResponse Value` trv
		ON trl.name = trv.parent and
		trl.latest_version = trv.version
		WHERE tuf.name = '{0}'
		AND tq.evaluate = 1
		GROUP BY tq.name
	""".format(user_feedback)

	recs = frappe.db.sql(get_user_responses, as_dict = 1)
	return pd.DataFrame.from_records(recs).set_index('name').to_dict(orient = 'index')

@frappe.whitelist()
def send_survey_reminders():
	query = """
	SELECT tuf.user,
		tuf.survey
	FROM `tabUser Feedback` tuf
	INNER JOIN `tabSurvey` ts
	ON ts.name  = tuf.survey
	WHERE tuf.workflow_state = 'Created'
	AND ts.enable_reminders = 1
	AND NOW() - INTERVAL ts.days_before_reminder DAY > tuf.creation
	"""
	pending_surveys = frappe.db.sql(query, as_dict = 1)
	for survey in pending_surveys:
		recepients = [survey['user']]
		email_args = {
			"recipients": recepients,
			"message": """
				Hi {user},
				{survey} which had been assigned to you is still not submitted. Please fill it at the earliest.
			""".format(user = survey['user'], survey = survey['survey']),
			"subject": 'Reminer to Submit - {0}'.format(survey['survey']),
			"reference_doctype": "Survey",
		"reference_name": survey['survey']
		}
		enqueue(method=frappe.sendmail, queue='short', timeout=300, **email_args)
