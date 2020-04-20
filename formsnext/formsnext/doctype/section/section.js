// Copyright (c) 2020, ElasticRun and contributors
// For license information, please see license.txt

frappe.ui.form.on('Section', {
	refresh: function(frm) {
		frm.set_query('conditional_question', function() {
			return {
				"filters": [
					['Section Item','parent',"=", frm.doc.name],
				]
			};
		});
	},
});
