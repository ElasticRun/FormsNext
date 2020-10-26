class Survey {
	constructor(wrapper){
		const that = this;
		this.wrapper = $(wrapper);
		$(`
			<span class="openNav"><i class="fas fa-bars"></i></span>
			<div class="sidebar" id="mySidenav">
				<div class="surveyHeading">
					<label class="title">Your Surveys</label>
					<button class="closeNav"><i class="fas fa-times"></i></button>
				</div>
				<button class="dropdown-btn navTitle">New
					<i class="fas fa-chevron-down"></i>
				</button>
				<div class="dropdown-container">
				</div>
				
				<button class="dropdown-btn navTitle">Partially Completed
					<i class="fas fa-chevron-down"></i>
				</button>
				<div class="dropdown-container">
				</div>

				<button class="dropdown-btn navTitle">Completed
					<i class="fas fa-chevron-down"></i>
				</button>
				<div class="dropdown-container">
				</div>
				
			</div>
			<div class="dashboard">
				<div class="dashboard-graph row">
					<div class="col-md-12">
						<div class="serveyConyent">
							<div class="section-title row"><h1 class="title"></h1></div>
							<div class="section-details row"><p></p></div>
							<div class="section-questions row"></div>
							<div class="section-footer row"></div>
						</div>
					</div>
				</div>
			</div>`).appendTo(this.wrapper.find(".page-content"));
		$('.row.layout-main .layout-main-section-wrapper').css({ 'margin': '0px' });
		this.container = this.wrapper.find(".dashboard-graph");
		this.page = wrapper.page;
		this.wrapper.find(".openbtn").click(()=>{
			if (that.wrapper.find(".sidebar").css("width") == "250px"){
				that.wrapper.find(".sidebar").css("width", "250px");
				that.wrapper.find(".dashboard").css("marginLeft", "250px");
			} else {
				that.wrapper.find(".sidebar").css("width", "0px");
				that.wrapper.find(".dashboard").css("marginLeft", "0px");
			}
		});

		this.wrapper.find(".closeNav").click(()=>{
			document.getElementById("mySidenav").style.width = "0";
			that.wrapper.find(".dashboard").css("marginLeft", "45px");
		});

		this.wrapper.find(".openNav").click(()=>{
			document.getElementById("mySidenav").style.width = "250px";
			that.wrapper.find(".dashboard").css("marginLeft", "250px");
		});

		var dropdown = document.getElementsByClassName("dropdown-btn");
		var i;

		for (i = 0; i < dropdown.length; i++) {
			dropdown[i].addEventListener("click", function() {
				this.classList.toggle("active");
				var dropdownContent = this.nextElementSibling;
				if (dropdownContent.style.display === "block") {
					dropdownContent.style.display = "none";
				} else {
				dropdownContent.style.display = "block";
				}
			});
		}
		

		frappe.call({
			method: "formsnext.formsnext.page.survey.survey.get_active_surveys",
			callback: function(response){
				response.message.forEach((survey)=>{
					var survey_link = '<a class="active-survey">' + survey['survey'] + '</a>'
					if (survey['workflow_state'] == "Created"){
						$('.dropdown-container').eq(0).after(survey_link)
					} else if (survey['workflow_state'] == "Partially Completed") {
						$('.dropdown-container').eq(1).after(survey_link)
					} else {
						$('.dropdown-container').eq(2).after(survey_link)
					}
				})

				that.wrapper.find('.active-survey').on('click', (x)=>{
					frappe.ui.pages.survey.$title_area.text(x.target.text)
					frappe.dom.freeze('Loading Your Form')
					that.get_feedback_doc(x.target.text).then(()=>{
						if (that.feedback_doc.workflow_state == "Completed"){
							that.render_end_screen()
						} else {
							that.render_section()
						}
						frappe.dom.unfreeze()
					})
				})
			}
		})
		
	}

	get_feedback_doc(survey_name){
		let that = this
		return new Promise((resolve, reject)=>{
			frappe.model.with_doc('User Feedback', frappe.session.user + "-" + survey_name).then((feedback_doc)=>{
				frappe.model.with_doc('Survey', survey_name).then(async (survey_doc)=>{
					for(let i=0; i < survey_doc.sections.length; i++){
						let sec_doc = await frappe.model.with_doc("Section", survey_doc.sections[i].section_link)
						for(let j=0; j< sec_doc.questions.length; j++){
							let qp_doc = await frappe.model.with_doc(sec_doc.questions[j].question_type, sec_doc.questions[j].question_parameters)
							sec_doc.questions[j]["question_parameters_doc"] = qp_doc
							
						}
						survey_doc.sections[i]["section_doc"] = sec_doc
					}
					feedback_doc.survey_doc = survey_doc
					that.feedback_doc = feedback_doc
					that.question_response_score = []
					resolve()
				})
			})
		})		
	}

	render_section(){
		let that = this
		var current_section = this.feedback_doc.current_section
		this.container.find('.section-title h1').html(this.feedback_doc.survey_doc.sections[current_section].section_doc.section_title)
		this.container.find('.section-details p').html(this.feedback_doc.survey_doc.sections[current_section].section_doc.section_description)
		this.container.find('.section-questions').html('')
		if(current_section == this.feedback_doc.survey_doc.sections.length - 1){
			this.container.find('.section-footer').html(`<button class="submit-section erPrimaryBtn">Finish</button>`)
		} else {
			this.container.find('.section-footer').html(`<button class="submit-section erSecondaryBtn">Next</button>`)
		}
		this.feedback_doc.survey_doc.sections[current_section].section_doc.questions.forEach((q_doc, i)=>{
			that.render_question(q_doc, i, current_section)
		})
		this.container.find(".submit-section").click(()=>{
			that.validate_and_submit_section()
		})

	}

	validate_and_submit_section(){
		let that = this
		let current_section = this.feedback_doc.current_section
		let valid_responses = true
		let error_messages = []
		let responses = []
		let scores = []
		this.feedback_doc.survey_doc.sections[current_section].section_doc.questions.forEach((q_doc, i)=>{
			let user_response = that.fetch_question_response(q_doc)
			scores.push(that.score_question_response(q_doc, user_response))
			responses.push(user_response)
			let validation_response = that.validate_question_response(q_doc, user_response)
			if (!validation_response['is_valid']){
				valid_responses = false
				error_messages.push(validation_response['error_message'])
			}
		})
		if (valid_responses){
			that.submit_section(responses, scores)
		} else {
			frappe.msgprint(error_messages.join("\n\n"))
		}
	}

	submit_section(responses, scores){
		let that = this
		let current_section = this.feedback_doc.current_section
		let questions = this.feedback_doc.survey_doc.sections[current_section].section_doc.questions
		let qr_pairs = {}
		for(var i =0; i < questions.length; i++){
			qr_pairs[questions[i].name] = responses[i]
		}
		frappe.call({
			method: "formsnext.formsnext.page.survey.survey.submit_section",
			args: {
				user_feedback_name: that.feedback_doc.name,
				question_response_pairs: qr_pairs,
				scores: scores,
				current_section: current_section,
				current_section_name: that.feedback_doc.survey_doc.sections[current_section].section_doc.name
			},
			callback: function(response){
				if (that.feedback_doc.survey_doc.sections[current_section].section_doc.end_survey){
					that.render_end_screen()
				} else {
					that.feedback_doc.current_section = response.message
					that.render_section()
				}
			}
		})
	}

	render_end_screen(){
		let that = this
		if(this.feedback_doc.survey_doc.survey_type == "Info"){
			this.container.html(`<div class="col-md-12">
			<div class="serveyConyent">` + this.feedback_doc.survey_doc.end_screen + 
			`</div></div>`)
		} else {
			frappe.call({
				method: "formsnext.formsnext.doctype.user_feedback.user_feedback.get_results",
				args: {
					user_feedback: this.feedback_doc.name
				},
				callback: function(response){
					if (that.feedback_doc.survey_doc.result_view == "Counts"){
						let correct_count = 0;
						let wrong_count = 0;
						Object.keys(response.message).forEach((qn)=>{
							if(response.message[qn].score){
								correct_count = correct_count +1
							} else {
								wrong_count = wrong_count + 1
							}
						})
						let html_str = `<div class="col-md-12">
						<div class="serveyConyent">
								<div class="result row">
									<h1>Assesment Results</h1>
									<label>Total Questions : ` + (correct_count + wrong_count) + `</label>
									<div class="row col-md-12">
										<label class="correct"><i class="far fa-check-circle"></i>` + correct_count + ` Correct</label>
										<label class="wrong"><i class="far fa-times-circle"></i>` + wrong_count + ` Incorrect</label>
									</div>
								</div>
							</div>
						</div>`
						that.container.html(html_str)

					} else if (that.feedback_doc.survey_doc.result_view == "Question Level"){
						let correct_count;
						let wrong_count;
						let table_str = `<div class="col-md-12">
						<div class="serveyConyent"><table class="table table-hover"><tr><th>Question></th><th>Answer</th><th>Result</th><th>Feedback</th></tr>`
						Object.keys(response.message).forEach((qn)=>{
							if(response.message[qn].score){
								correct_count = correct_count + 1
							} else {
								wrong_count = wrong_count + 1
							}
							table_str = table_str + `<tr><td>` + response.message[qn].question_string + 
								`</td><td>` + response.message[qn].responses + 
								`</td><td>` + response.message[qn].score +
								`</td><td>` + (response.message[qn].score ? "" : response.message[qn].feedback_if_incorrect) + `</td></tr>` 
						})
						table_str = table_str + `</table></div></div>`
						that.container.html(table_str)

					} else if (that.feedback_doc.survey_doc.result_view == "Question Level With Correct"){
						let table_with_ans = `<div class="col-md-12">
						<div class="serveyConyent"><table class="table table-hover"><tr><th>Question</th><th>Answer</th><th>Correct Answer</th><th>Result</th><th>Feedback</th></tr>`
						that.feedback_doc.survey_doc.sections.forEach((sec)=>{
							sec.section_doc.questions.forEach((qt)=>{
								if(qt.evaluate){
									let correct_answers = that.get_correct_answers(qt)
									table_with_ans = table_with_ans + `<tr><td>` + response.message[qt.name].question_string + 
										`</td><td>` + response.message[qt.name].responses + 
										`</td><td>` + correct_answers.join(" , ") + 
										`</td><td>` + response.message[qt.name].score +
										`</td><td>` + (response.message[qt.name].score ? "" : qt.feedback_if_incorrect) + `</td></tr>` 
								}
							})
						})
						table_with_ans = table_with_ans + `</table></div></div>`
						that.container.html(table_with_ans)
					}
					
				}
			})
		}
	}

	get_correct_answers(qt){
		let correct_answers = []
		switch(qt.question_type) {
			case 'Single Value Question':
				correct_answers = [qt.question_parameters_doc.correct_value]
				break;
			case 'Multiple Choice Question':
				qt.question_parameters_doc.question_choices.forEach((qc)=>{
					if (qc.should_be_selected){
						correct_answers.push(qc.value)
					}
				})
				break;
			case 'Grid Question':
				qt.question_parameters_doc.grid_options.forEach((go)=>{
					if (go.should_be_selected){
						correct_answers.push(qo.value)
					}
				})
			case 'Linear Scale Question':
				correct_answers = [qt.question_parameters_doc.correct_value]
				break;
			case 'File Upload Question':
				break;
		}
		return correct_answers
	}

	fetch_question_response(q_doc){
		let response = []
		switch(q_doc.question_type) {
			case 'Single Value Question':
				switch(q_doc.question_parameters_doc.type){
					case 'Date':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "String"
						})
						break;
					case 'Time':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "String"
						})
						break;
					case 'Datetime':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "String"
						})
						break;
					case 'Float':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "Float"
						})
						break;
					case 'Int':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "Int"
						})
						break;
					case 'Text':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "String"
						})
						break;
					case 'Paragraph':
						response.push({
							value: q_doc.question_container.find("input").val(),
							datatype: "String"
						})
						break;
				}
				break;
			case 'Multiple Choice Question':
				switch(q_doc.question_parameters_doc.display_type){
					case 'Dropdown':
						response.push({
							value: q_doc.question_container.find("option:selected").val(),
							datatype: "String"
						})
						break;
					case 'List':
						response.push({
							value: q_doc.question_container.find("input:checked").val(),
							datatype: "String"
						})
						break;
					case 'Checkbox':
						q_doc.question_container.find("input:checked").each((s)=>{
							response.push({
								value: q_doc.question_container.find("input:checked").eq(s).val(),
								datatype: "String"
							})
						})
						break
				}
				break;
			case 'Grid Question':
				break;
			case 'Linear Scale Question':
				response.push({
					value: parseFloat(q_doc.question_container.find("input").val()),
					datatype: "Float"
				})
				break;
			case 'File Upload Question':
				break;
		}
		return response
	}

	validate_question_response(q_doc, response){
		let is_valid;
		let error_message;
		switch(q_doc.question_type) {
			case 'Single Value Question':
				switch(q_doc.question_parameters_doc.type){
					case 'Date':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							is_valid = true
							error_message = ""
						}
						break
					case 'Time':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							is_valid = true
							error_message = ""
						}
						break;
					case 'Datetime':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							is_valid = true
							error_message = ""
						}
						break;
					case 'Float':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							if(response[0].value >= q_doc.question_parameters_doc.minimum_value){
								is_valid = true
								error_message = ""
								if (q_doc.question_parameters_doc.maximum_value !=0 && response[0].value > q_doc.question_parameters_doc.maximum_value){
									is_valid = false
									error_message = "Data Too Large in " + q_doc.question_string 
								}
							} else {
								is_valid = false
								error_message = "Data Too Small in " + q_doc.question_string
							}
						}
						break;
					case 'Int':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							if(response[0].value >= q_doc.question_parameters_doc.minimum_value){
								is_valid = true
								error_message = ""
								if (q_doc.question_parameters_doc.maximum_value !=0 && response[0].value > q_doc.question_parameters_doc.maximum_value){
									is_valid = false
									error_message = "Data Too Large in " + q_doc.question_string
								}
							} else {
								is_valid = false
								error_message = "Data Too Small in " + q_doc.question_string
							}
						}
						break;
					case 'Text':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							console.log(response, q_doc.question_parameters_doc.minimum_length)
							if(response[0].value.length >= q_doc.question_parameters_doc.minimum_length){
								is_valid = true
								error_message = ""
								if (q_doc.question_parameters_doc.maximum_length !=0 && response[0].value.length > q_doc.question_parameters_doc.maximum_length){
									is_valid = false
									error_message = "Data Too Long in " + q_doc.question_string
								}
							} else {
								is_valid = false
								error_message = "Data Too Short in " + q_doc.question_string
							}
						}
						break;
					case 'Paragraph':
						if (response[0].value == "" && q_doc.mandatory){
							is_valid = false
							error_message = q_doc.question_string + " is mandatory"
						} else {
							if(response[0].value.length >= q_doc.question_parameters_doc.minimum_length){
								is_valid = true
								error_message = ""
								if (q_doc.question_parameters_doc.maximum_length !=0 && response[0].value.length > q_doc.question_parameters_doc.maximum_length){
									is_valid = false
									error_message = "Data Too Long in " + q_doc.question_string
								}
							} else {
								is_valid = false
								error_message = "Data Too Short in " + q_doc.question_string
							}
						}
						break;
				}
				break;
				
			case 'Multiple Choice Question':
				is_valid = true
				error_message = ""
				if (q_doc.question_parameters_doc.display_type == "Checkbox"){
					if (q_doc.question_parameters_doc.select_exactly !=0 && response.length != q_doc.question_parameters_doc.select_exactly){
						is_valid = false
						error_message = "You need to select exactly " + q_doc.question_parameters_doc.select_exactly 
					} else if (response.length < q_doc.question_parameters_doc.select_at_least){
						is_valid = false
						error_message = "You need to select atleast " + q_doc.question_parameters_doc.select_at_least 
					} else if (q_doc.question_parameters_doc.select_at_most != 0 && response.length > q_doc.question_parameters_doc.select_at_most){
						is_valid = false
						error_message = "You need to less than " + q_doc.question_parameters_doc.select_at_most 
					}
				} else if (q_doc.question_parameters_doc.display_type == "List"){
					if (q_doc.mandatory && response[0].value == undefined){
						is_valid = false
						error_message = q_doc.question_string + " is mandatory"
					}
				}
				else if (q_doc.question_parameters_doc.display_type == "Dropdown"){
					if (q_doc.mandatory && response[0].value == ""){
						is_valid = false
						error_message = q_doc.question_string + " is mandatory"
					}
				}
				break;
			case 'Grid Question':
				is_valid = true
				error_message = ""
				if (q_doc.question_parameters.row_type == "Checkbox"){
					if (q_doc.question_parameters_doc.select_exactly !=0 && response.length != q_doc.question_parameters_doc.select_exactly){
						is_valid = false
						error_message = "You need to select exactly " + q_doc.question_parameters_doc.select_exactly 
					} else if (response.length < q_doc.question_parameters_doc.select_at_least){
						is_valid = false
						error_message = "You need to select atleast " + q_doc.question_parameters_doc.select_at_least 
					} else if (q_doc.question_parameters_doc.select_at_most != 0 && response.length > q_doc.question_parameters_doc.select_at_most){
						is_valid = false
						error_message = "You need to less than " + q_doc.question_parameters_doc.select_at_most 
					}
				}
				break;
			case 'Linear Scale Question':
				is_valid = true
				error_message = ""
				break;
			case 'File Upload Question':
				is_valid = true
				error_message = ""
				break;
		}
		return {
			"is_valid": is_valid,
			"error_message": error_message
		}
	}

	score_question_response(q_doc, response){
		let that = this
		let score = 0
		let correct_values = []
		let answers = []		
		switch(q_doc.question_type) {
			case 'Single Value Question':
				if(response[0].value == q_doc.question_parameters_doc.correct_value){
					score = 1
				}
				break;
			case 'Multiple Choice Question':
				q_doc.question_parameters_doc.question_choices.forEach((v)=>{
					if (v.should_be_selected == 1){
						correct_values.push(v.value)
					}
				})
				score = 1
				response.forEach((v)=>{
					if (! correct_values.includes(v.value)){
						score = 0 
					}
					answers.push(v.value)
				})

				correct_values.forEach((v)=>{
					if (! answers.includes(v)){
						score = 0 
					}
				})
				break;
			case 'Grid Question':
				q_doc.question_parameters_doc.grid_options.forEach((v)=>{
					if (v.should_be_selected == 1){
						correct_values.push(v.value)
					}
				})
				score = 1
				response.forEach((v)=>{
					if (! correct_values.includes(v.value)){
						answers.push(v.value)
						score = 0 
					}
				})

				correct_values.forEach((v)=>{
					if (! answers.includes(v)){
						score = 0 
					}
				})
				break;
			case 'Linear Scale Question':
				if(response[0].value == q_doc.question_parameters_doc.correct_value){
					score = 1
				}
				break;
			case 'File Upload Question':
				break;
		}
		return score
	}

	render_question(q_doc, q_doc_seq, current_section){
		let question_html = ""
		switch(q_doc.question_type) {
			case 'Single Value Question':
				switch(q_doc.question_parameters_doc.type){
					case 'Date':
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
							<div class="col-md-6 padding0">
								<div id="datepicker" class="input-group date" data-date-format="mm-dd-yyyy">
									<input class="form-control" type="text" readonly />
									<span class="input-group-addon"><i class="glyphicon glyphicon-calendar"></i></span>
								</div>
							</div>	
						</div><hr/>`
						break;
					case 'Time':
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
							<div class="col-md-6 padding0">
							<div class="form-group">
                                                <div class="input-group date" id="datetimepicker3">
                                                    <input data-format="hh:mm:ss" class="form-control" id="timepicker1" type="text" value = "07:00 AM"></input>
                                                    <span class="input-group-addon">
                                                        <span class="glyphicon glyphicon-time"></span>
                                                            </span>
                                                        </div>
                                            </div></div>
							
						</div><hr/>`
						break;
					case 'Datetime':
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
							<input type="date">
						</div><hr/>`
						break;
					case 'Float':
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
							<input type="number">
						</div><hr/>`
						break;
					case 'Int':
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
							<input type="number">
						</div><hr/>`
						break;
					case 'Text':
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
							<div class="form-group">
								<div class="col-md-6 padding0">
									<input type="text" class="form-control" id="">
								</div>
							</div>
						</div><hr/>`
						break;
					case 'Paragraph':
						break;
				}
				break;

				
									
								
				
			case 'Multiple Choice Question':
				switch(q_doc.question_parameters_doc.display_type){
					case 'Dropdown':
						let select_options = ""
						q_doc.question_parameters_doc.question_choices.forEach((ch)=>{
							select_options = select_options + '<option value="' + ch.value + '">' + ch.display_text + '</option>'
						})
						question_html = `<div class="question-container row">
						<h2>` + q_doc.question_string + `</h2>
						<div class="form-group"><div class="col-md-6 padding0"><select class="form-control arrow">` + select_options + `</select></div></div>
						
					</div><hr/>`
						break;
					case 'List':
						let list_inputs = ""
						q_doc.question_parameters_doc.question_choices.forEach((ch)=>{
							list_inputs = list_inputs + `<label class="radioContainer"><input type="radio" name="choices" value="` + ch.value + `"><span class="checkmark"></span>` + ch.display_text + `</label>`
						})
						question_html = `<div class="question-container row">
						<h2>` + q_doc.question_string + `</h2>
						<form action="">` + list_inputs + `</form>`
						break;
					case 'Checkbox':
						let form_inputs = ""
						q_doc.question_parameters_doc.question_choices.forEach((ch)=>{
							form_inputs = form_inputs + `<label class="checkboxContainer"><input type="checkbox" name="choices" value="` + ch.value + `">` + ch.display_text + `<span class="checkboxCheckmark"></span> </label>`
						})
						question_html = `<div class="question-container row">
							<h2>` + q_doc.question_string + `</h2>
						<form action="">` + form_inputs + `</form>`
						break
				}
				break;
			case 'Grid Question':
				break;	
			case 'Linear Scale Question':
				question_html = `<div class="question-container row">
					<h2>` + q_doc.question_string + `</h2>
					<div class="form-group"><div class="col-md-6 padding0"><form action="" class="rangeNumber"><span class="">` + 
					q_doc.question_parameters_doc.lower_limit + `</span><input type="range" min="` +  
				q_doc.question_parameters_doc.lower_limit + `" max="` + 
				q_doc.question_parameters_doc.upper_limit + `"><span class="">` + q_doc.question_parameters_doc.upper_limit + `</span></form></div></div></div><hr/>`
				break;
			case 'File Upload Question':
				break;
		}
		this.container.find('.section-questions').append(question_html)
		this.feedback_doc.survey_doc.sections[current_section].section_doc.questions[q_doc_seq]["question_container"] = this.container.find('.question-container').eq(q_doc_seq)				
	}
}


const getLink = function(url, id) {
	return new Promise(((resolve, reject) => {
		const link = document.createElement('link');
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('type', 'text/css');
		link.setAttribute('id', id);
		link.onload = resolve;
		link.onerror = reject;
		link.setAttribute('href', url);
		document.getElementsByTagName('head')[0].appendChild(link);
	}));
}

frappe.pages['survey'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Survey',
		single_column: true
	});




	if (window.__loading_dependencies) {
		return;
	}
	window.__loading_dependencies = new Promise(async (resolve, reject) => {
		await getLink('/assets/formsnext/css/survey.css', 'dashboard-base-theme');
		resolve();		
	}).catch(e => {
		reject(e);
	});

	Promise.resolve(window.__loading_dependencies).then((v) => {
		// Expanding Container
		$('.container').removeClass('container').addClass('container-fluid');

		var survey_form = new Survey(wrapper)
	});

}

frappe.require([
	"assets/formsnext/css/new_font_awesome.css",
	"assets/formsnext/js/bootstrap.min.js",
	"assets/formsnext/css/bootstrap-datepicker.css",
	"assets/formsnext/js/bootstrap-datepicker.js",
]);


$(function () {
	$("#datepicker").datepicker({
		  autoclose: true, 
		  todayHighlight: true
	}).datepicker('update', new Date());
  });

  