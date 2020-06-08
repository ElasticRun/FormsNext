# Copyright (c) 2013, ElasticRun and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
import pandas as pd

def execute(filters=None):
	survey = filters.get("survey")
	query = """
	SELECT
		tuf.user,
		tq.question_string AS Question, 
		tq.evaluate AS Evaluate,
		(CASE WHEN tq.evaluate THEN trl.score ELSE NULL END) AS Score, 
		GROUP_CONCAT(trv.value) AS Responses
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
	WHERE tuf.survey = '{survey}'
	GROUP BY tuf.user, tq.name
	""".format(survey=survey)
	results = frappe.db.sql(query, as_dict = 1)
	results_df = pd.DataFrame.from_records(results)
	pivoted_results = results_df.pivot_table(index = 'user', columns = ['Question'], values = 'Responses', aggfunc={'Responses': max}).reset_index()
	columns = pivoted_results.columns.tolist()
	data = pivoted_results.values.tolist()

	return columns, data
