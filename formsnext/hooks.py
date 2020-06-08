# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from . import __version__ as app_version

app_name = "formsnext"
app_title = "FormsNext"
app_publisher = "ElasticRun"
app_description = "Knights Watch FormsNext"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "support@elastic.run"
app_license = "(C) ElasticRun 2020"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/formsnext/css/formsnext.css"
# app_include_js = "/assets/formsnext/js/formsnext.js"

# include js, css files in header of web template
# web_include_css = "/assets/formsnext/css/formsnext.css"
# web_include_js = "/assets/formsnext/js/formsnext.js"

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Website user home page (by function)
# get_website_user_home_page = "formsnext.utils.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "formsnext.install.before_install"
# after_install = "formsnext.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "formsnext.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------
scheduler_events = {
    "daily": [
        "formsnext.formsnext.doctype.user_feedback.user_feedback.send_survey_reminders"
    ]
}
# scheduler_events = {
# 	"all": [
# 		"formsnext.tasks.all"
# 	],
# 	"daily": [
# 		"formsnext.tasks.daily"
# 	],
# 	"hourly": [
# 		"formsnext.tasks.hourly"
# 	],
# 	"weekly": [
# 		"formsnext.tasks.weekly"
# 	]
# 	"monthly": [
# 		"formsnext.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "formsnext.install.before_tests"

# Overriding Whitelisted Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "formsnext.event.get_events"
# }
fixtures = ["Workflow", "Workflow State", "Custom Script", "Role",
            "Property Setter", { 'doctype':"Report",'filters':{'is_standard': 'No'}}, "Workflow Action Master", 
        {
        'doctype': 'Print Format',
        'filters': {'standard':'No'}
        }
    , "Letter Head"]

