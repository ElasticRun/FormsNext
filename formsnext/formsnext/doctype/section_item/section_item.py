# -*- coding: utf-8 -*-
# Copyright (c) 2020, ElasticRun and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe.model.document import Document
import uuid

class SectionItem(Document):
	def autoname(self):
		self.name = self.question_string + "-" + uuid.uuid1().hex
		self.name = self.name[:100]