// Copyright (c) 2016, ElasticRun and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Survey All Results"] = {
	"filters": [
		{
			"fieldname":"survey",
			"label": "Survey",
			"fieldtype": "Link",
			"options": "Survey",
			"reqd": 1
		}
	]
}
