function setVisibility() {
    var type = $('#database-type option:selected').text()
    if (type == 'MySQL' || type == 'PostgreSQL') {
		$(".ssh-available").show();
	} else {
		$(".ssh-available").hide();
	}

	if ($("#use-ssh").is(':checked')) {
		$(".ssh").show();

		if ($("#use-ssh-key").is(':checked')) {
			$(".ssh-key").show();
			$(".ssh-password").hide();

			if ($('#SshKeyFileID').val() == '') {
				$('#not-uploaded').show();
				$('#uploaded').hide();
			} else {
				$('#not-uploaded').hide();
				$('#uploaded').show();
			}
		} else {
			$(".ssh-key").hide();
			$(".ssh-password").show();
		}
	} else {
		$(".ssh").hide();
	}
}

function setDefaultPort() {
    var type = $('#database-type option:selected').text()
    if (type == 'MySQL') {
		$("#database-port").val("3306");
    } else if (type == 'PostgreSQL') {
        $("#database-port").val("5432");
    } else {
		$("#database-port").val("1433");
	}
}

function setSshKeyFileLink(url, filename) {

}

function clearInputFile() {
	var f = document.getElementById("key-file");
	if (f.value) {
		try {
			f.value = ''; //for IE11, latest Chrome/Firefox/Opera...
		} catch (err) { }
		if (f.value) { //for IE5 ~ IE10
			var form = document.createElement('form'),
                parentNode = f.parentNode, ref = f.nextSibling;
			form.appendChild(f);
			form.reset();
			parentNode.insertBefore(f, ref);
		}
	}
}

// these two methods prevent validation on keyup or focus out for the file upload input
jQuery.validator.defaults.onfocusout = function (element, event) {
	if ($(element).attr('id') == "key-file") {
		return;
	}

	this.element(element);
}

jQuery.validator.defaults.onkeyup = function (element, event) {
	if ($(element).attr('id') == "key-file") {
		return;
	}

	this.element(element);
}

// this adds validation to make sure the user has uploaded an ssh key if one is necessary
jQuery.validator.addMethod('sshkeyfile', function (value, element) {
	return !$('#use-ssh-key').is(':checked') || $('#SshKeyFileID').val() != '';
}, '');

jQuery.validator.unobtrusive.adapters.add('sshkeyfile', {}, function (options) {
	options.rules['sshkeyfile'] = true;
	options.messages['sshkeyfile'] = options.message;
});

$(document).ready(function () {
	$(document).on('invalid-form.validate', 'form', function () {
		var button = $(this).find('#btnCreate');
		setTimeout(function () {
		    button.removeAttr('disabled');
		}, 1);
	});

	$(document).on('submit', 'form', function () {
		var button = $(this).find('#btnCreate');
		setTimeout(function () {
		    button.attr('disabled', 'disabled');
		}, 0);
	});

	$('.qt-description-container').each(function () {
		var parent = $(this);
		var resizeFn = function () {
		    parent.children().each(function () {
		        var elem = $(this);
		        var sideBarNavWidth = parent.width() - parseInt(elem.css('paddingLeft')) - parseInt(elem.css('paddingRight')) - parseInt(elem.css('marginLeft')) - parseInt(elem.css('marginRight')) - parseInt(elem.css('borderLeftWidth')) - parseInt(elem.css('borderRightWidth'));
		        elem.css('width', sideBarNavWidth);
		    })

		};

		resizeFn();
		$(window).resize(resizeFn);
	});

	var showDescription = function () {
		var desc = $('#' + $(this).attr('aria-describedby'));
		var other = $('.qt-description-content:not(#' + desc.attr('id') + ')');
		$('.qt-description-container').show();
		desc.show();
		other.hide();
	};

	$('[aria-describedby]')
        .focus(showDescription)
        .hover(showDescription);

	setVisibility();
	setDefaultPort();

	$("#database-type").change(setDefaultPort);
	$("#use-ssh").click(setVisibility);
	$("#use-ssh-key").change(setVisibility);
	$("#database-type").change(setVisibility);

	$("#change-key-file").click(function () {
		$('#SshKeyFileID').val('');
		clearInputFile();
		setVisibility();
	});

	$("#key-file").change(function () {
		var files = document.getElementById("key-file").files;
		if (files.length > 0) {
			var formData = new FormData();
			formData.append("key-file", files[0]);

			$.ajax({
				type: "POST",
				url: sshUploadUrl,
				data: formData,
				dataType: 'json',
				contentType: false,
				processData: false,
				success: function (response) {
					if (response && response.status && response.status == 'ok' && response.sshKeyFileID) {
						$('#SshKeyFileID').val(response.sshKeyFileID);
						$('#filename').text(response.filename);
						raiseSuccessAlert('upload-msg', 'Successfully uploaded key file');
					} else {
						$('#SshKeyFileID').val('');
						$('#filename').text('');
						raiseErrorAlert('upload-msg', response.message ? response.message : 'An error occurred while uploading the file, please try again');
						clearInputFile();
					}
					setVisibility();
				},
				error: function (error) {
					$('#SshKeyFileID').val('');
					$('#filename').text('');
					raiseErrorAlert('upload-msg', 'An error occurred while uploading the file, please try again');
					clearInputFile();
					setVisibility();
				}
			});
		}
	});

	$('#use-ssh').change(function () {
		if ($(this).is(':checked')) {
			$("[name='SshPort']").rules('add', {
				required: true
			});

			$("[name='SshUsername']").rules('add', {
				required: true
			});
		} else {
			$("[name='SshPort']").rules('remove', 'required');
			$("[name='SshUsername']").rules('remove', 'required');
		}
	});


	$("#testconnection").click(function () {
		var inputs = $('#mainForm').find(':enabled');
		$("#testconnection").val('Connecting...');

		var server = $("[name='Server']").val();
		var port = $("[name='Port']").val();
		var username = $("[name='Username']").val();
		var password = $("[name='DbPssword']").val();
		var type = $("[name='Type']").val();
		var useSsh = $("[name='UseSsh']").is(':checked');
		var sshServer = $("[name='SshServer']").val();
		var sshPort = $("[name='SshPort']").val();
		var sshUsername = $("[name='SshUsername']").val();
		var sshPassword = $("[name='SshPassword']").val();
		var UseSshKey = $("[name='UseSshKey']").is(':checked');
		var SshKeyFileID = $("[name='SshKeyFileID']").val();
		var databaseName = $("[name='DatabaseName']").val();
        var databaseConnectionId = $("[name='DatabaseConnectionID']").val();

		inputs.attr("disabled", true);
		$.ajax({
			url: testConnectionUrl,
			data: { 
                'server': server, 
                'port': port, 
                'username': username, 
                'password': password, 
                'type': type, 
				'useSsh': useSsh,
				'sshServer': sshServer, 
                'sshPort': sshPort, 
                'sshUsername': sshUsername, 
                'sshPassword': sshPassword, 
                'SshKeyFileID': SshKeyFileID, 
                'UseSshKey': UseSshKey, 
                'databaseName': databaseName,
                'databaseConnectionId': databaseConnectionId
            },
			dataType: 'json',
			type: "POST",
			success: function (data) {
				inputs.removeAttr("disabled")
				$("#testconnection").val('Test this Connection');
				if (data.message == 'Success') {
					raiseSuccessAlert('testconnection-msg', 'Successfully connected to database');
				} else {
					raiseErrorAlert('testconnection-msg', data.message, 0);
				}
			},
			error: function (error) {
				inputs.removeAttr("disabled")
				$("#testconnection").val('Test this Connection');
				raiseErrorAlert('testconnection-msg', 'Failed to connect');
			}
		});
	})
});