function clearAlerts() {
    return $('.alert-container').empty();
}
function clearAlert(id) {
    $('.alert-container div').filter('#' + id).remove();
}
function raiseAlert(id, message, alertClass, timeout) {
    clearAlert(id);
    var div = $('<div class="alert alert-dismissable"></div>').addClass(alertClass).attr('id', id);
    div.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
    div.append($('<span>').text(message));
    $('.alert-container').append(div);

    var realTimeout = timeout;
    if (realTimeout === undefined) {
        realTimeout = 5000;
    }

    if (realTimeout != 0) {
        window.setTimeout(function () {
            div.fadeTo(500, 0).slideUp(500, function () {
                $(this).remove();
            });
        }, realTimeout);
    }
}
function raiseErrorAlert(id, message, timeout) {
    raiseAlert(id, message, 'alert-danger', timeout);
}
function raiseInfoAlert(id, message, timeout) {
    raiseAlert(id, message, 'alert-info', timeout);
}
function raiseSuccessAlert(id, message, timeout) {
    raiseAlert(id, message, 'alert-success', timeout);
}

var QueryString = function () {
    // This function is anonymous, is executed immediately and 
    // the return value is assigned to QueryString!
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
        }
    } 
    return query_string;
}();