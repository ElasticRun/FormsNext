# -*- coding: utf-8 -*-
# Copyright (c) 2020, ElasticRun and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
from frappe.exceptions import DuplicateEntryError

class Survey(Document):
	def on_update_after_submit(self):
		if self.workflow_state == "Published":
			survey_users = []
			for role_doc in self.enabled_for_roles:
				role_users = frappe.db.sql("""
					SELECT 
						parent 
					FROM `tabHas Role` 
					WHERE parenttype  = 'User'
					AND role = '{0}'
				""".format(role_doc.role), as_list = 1)
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
						"user_responses": user_responses
					}).insert()
				except DuplicateEntryError:
					pass


@frappe.whitelist()
def create_feedback(survey_id):
	survey_doc = frappe.get_doc("Survey", survey_id)
	survey_doc.on_update_after_submit()
	return True