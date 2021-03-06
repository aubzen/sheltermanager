/*jslint browser: true, forin: true, eqeq: true, white: true, sloppy: true, vars: true, nomen: true */
/*global $, jQuery, _, asm, common, config, controller, dlgfx, format, header, html, tableform, validate */

$(function() {

    var dialog = {
        add_title: _("Extra images"),
        close_on_ok: true,
        html_form_action: "report_images",
        html_form_enctype: "multipart/form-data",
        columns: 1,
        width: 550,
        fields: [
            { post_field: "filechooser", label: _("Image file"), type: "file", validation: "notblank" }
        ]
    };

    var table = {
        rows: controller.rows,
        idcolumn: "NAME",
        edit: function(row) {
            window.location = "image?mode=dbfs&id=/reports/" + row.NAME;
        },
        columns: [
            { field: "NAME", display: _("Image file"), initialsort: true }
        ]
    };

    var buttons = [
         { id: "new", text: _("New"), icon: "new", enabled: "always", 
             click: function() { 
                 tableform.dialog_show_add(dialog, function() {
                     var fn = $("#filechooser").val().toLowerCase();
                     if (fn.indexOf(".jpg") == -1 && fn.indexOf(".png") == -1 && fn.indexOf(".gif") == -1) {
                         header.show_error(_("The selected file is not an image."));
                         $("label[for='filechooser']").addClass("ui-state-error-text");
                         return;
                     }
                     $("#form-tableform").submit();
                 });
             } 
         },
         { id: "delete", text: _("Delete"), icon: "delete", enabled: "multi", 
             click: function() { 
                 tableform.delete_dialog(function() {
                     tableform.buttons_default_state(buttons);
                     var ids = tableform.table_ids(table);
                     common.ajax_post("report_images", "mode=delete&ids=" + ids , function() {
                         window.location = "report_images";
                     });
                 });
             } 
         }
    ];

    var report_images = {

        render: function() {
            var s = "";
            s += tableform.dialog_render(dialog);
            s += html.content_header(_("Extra images"));
            s += html.info(_("This screen allows you to add extra images to your database, for use in reports and documents.") + "<br />" +
                _("Access them via the url 'image?mode=dbfs&id=/reports/NAME'") + "<br />" +
                _("Upload splash.jpg and logo.jpg to override the login screen image and logo at the top left of ASM."));
            s += tableform.buttons_render(buttons);
            s += tableform.table_render(table);
            s += html.content_footer();
            return s;
        },

        bind: function() {
            tableform.dialog_bind(dialog);
            tableform.buttons_bind(buttons);
            tableform.table_bind(table, buttons);
        }

    };

    common.module(report_images, "report_images", "options");

});
