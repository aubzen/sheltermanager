/*jslint browser: true, forin: true, eqeq: true, white: true, sloppy: true, vars: true, nomen: true */
/*global $, jQuery, _, asm, common, config, controller, dlgfx, format, header, html, tableform, validate */

$(function() {

    var dialog = {
        add_title: _("Add online form"),
        edit_title: _("Edit online form"),
        helper_text: _("Forms need a name."),
        close_on_ok: true,
        columns: 1,
        width: 550,
        fields: [
            { json_field: "NAME", post_field: "name", label: _("Name"), type: "text", validation: "notblank" },
            { json_field: "REDIRECTURLAFTERPOST", post_field: "redirect", label: _("Redirect to URL after POST"), 
                type: "text", 
                tooltip: _("After the user presses submit and ASM has accepted the form, redirect the user to this URL") },
            { json_field: "SETOWNERFLAGS", post_field: "flags", label: _("Person Flags"), type: "selectmulti" },
            { json_field: "DESCRIPTION", post_field: "description", label: _("Description"), type: "textarea" }
        ]
    };

    var table = {
        rows: controller.rows,
        idcolumn: "ID",
        edit: function(row) {
            tableform.dialog_show_edit(dialog, row, function() {
                tableform.fields_update_row(dialog.fields, row);
                tableform.fields_post(dialog.fields, "mode=update&formid=" + row.ID, "onlineforms", function(response) {
                    tableform.table_update(table);
                });
            });
        },
        columns: [
            { field: "NAME", display: _("Name"), initialsort: true, formatter: function(row) {
                return "<span style=\"white-space: nowrap\">" + 
                    "<input type=\"checkbox\" data-id=\"" + row.ID + "\" title=\"" + html.title(_("Select")) + "\" />" +
                    "<a href=\"onlineform?formid=" + row.ID + "\">" + row.NAME + "</a>" +
                    "<a href=\"#\" class=\"link-edit\" data-id=\"" + row.ID + "\">" + html.icon("edit", _("Edit online form")) + "</a>" +
                    "</span>";
            }},
            { field: "", display: _("Form URL"), formatter: function(row) {
                    var u = "/service?";
                    if (asm.useraccountalias) { u += "account=" + asm.useraccountalias + "&"; }
                    u += "method=online_form_html&formid=" + row.ID;
                    return '<a target="_blank" href="' + controller.baseurl + u + '">' + u + '</a>';
                }},
            { field: "REDIRECTURLAFTERPOST", display: _("Redirect to URL after POST") },
            { field: "SETOWNERFLAGS", display: _("Person Flags"), formatter: function(row) { return row.SETOWNERFLAGS.split("|").join(", "); }},
            { field: "NUMBEROFFIELDS", display: _("Number of fields") },
            { field: "DESCRIPTION", display: _("Description") }
        ]
    };

    var buttons = [
         { id: "new", text: _("New online form"), icon: "new", enabled: "always", 
             click: function() { 
                 tableform.dialog_show_add(dialog, function() {
                     tableform.fields_post(dialog.fields, "mode=create", "onlineforms", function(response) {
                         var row = {};
                         row.ID = response;
                         tableform.fields_update_row(dialog.fields, row);
                         controller.rows.push(row);
                         tableform.table_update(table);
                     });
                 });
             } 
         },
         { id: "delete", text: _("Delete"), icon: "delete", enabled: "multi", 
             click: function() { 
                 tableform.delete_dialog(function() {
                     tableform.buttons_default_state(buttons);
                     var ids = tableform.table_ids(table);
                     common.ajax_post("onlineforms", "mode=delete&ids=" + ids , function() {
                         tableform.table_remove_selected_from_json(table, controller.rows);
                         tableform.table_update(table);
                     });
                 });
             } 
         },
         { id: "headfoot", text: _("Edit Header/Footer"), icon: "forms", enabled: "always", tooltip: _("Edit online form HTML header/footer"),
             click: function() {
                $("#dialog-headfoot").dialog("open");
             }
         }
    ];

    var onlineforms = {

        load_person_flags: function() {
            var field_option = function(post, label) {
                return '<option value="' + post + '">' + label + '</option>\n';
            };
            var flag_option = function(flag) {
                return '<option>' + flag + '</option>';
            };
            var h = [
                field_option("aco", _("ACO")),
                field_option("banned", _("Banned")),
                field_option("donor", _("Donor")),
                field_option("fosterer", _("Fosterer")),
                field_option("homechecked", _("Homechecked")),
                field_option("homechecker", _("Homechecker")),
                field_option("member", _("Member")),
                field_option("shelter", _("Other Shelter")),
                field_option("retailer", _("Retailer")),
                field_option("staff", _("Staff")),
                asm.locale == "en_GB" ? field_option("giftaid", _("UK Giftaid")) : "",
                field_option("vet", _("Vet")),
                field_option("volunteer", _("Volunteer"))
            ];
            $.each(controller.flags, function(i, v) {
                h.push(flag_option(v.FLAG));
            });
            $("#flags").html(h.join("\n"));
            $("#flags").change();
        },

        render_headfoot: function() {
            return [
                '<div id="dialog-headfoot" style="display: none" title="' + html.title(_("Edit Header/Footer")) + '">',
                '<div class="ui-state-highlight ui-corner-all">',
                    '<p>',
                        '<span class="ui-icon ui-icon-info" style="float: left; margin-right: .3em;"></span>',
                        _("These are the HTML headers and footers used when displaying online forms."),
                    '</p>',
                '</div>',
                '<table width="100%">',
                '<tr>',
                '<td valign="top">',
                '<label for="rhead">' + _("Header") + '</label><br />',
                '<textarea id="rhead" data="header" class="asm-textarea headfoot" style="font-family: monospace" rows="10">',
                controller.header,
                '</textarea>',
                '<label for="rfoot">' + _("Footer") + '</label><br />',
                '<textarea id="rfoot" data="footer" class="asm-textarea headfoot" style="font-family: monospace" rows="10">',
                controller.footer,
                '</textarea>',
                '</td>',
                '</tr>',
                '</table>',
                '</div>'
            ].join("\n");
        },

        bind_headfoot: function() {
            var headfootbuttons = {};
            headfootbuttons[_("Save")] = function() {
                var formdata = "mode=headfoot&" + $(".headfoot").toPOST();
                common.ajax_post("onlineforms", formdata, function() { 
                    header.show_info(_("Updated."));
                    $("#dialog-headfoot").dialog("close");
                });
            };
            headfootbuttons[_("Cancel")] = function() { $(this).dialog("close"); };
            $("#dialog-headfoot").dialog({
                autoOpen: false,
                resizable: true,
                height: "auto",
                width: 800,
                modal: true,
                dialogClass: "dialogshadow",
                show: dlgfx.add_show,
                hide: dlgfx.add_hide,
                buttons: headfootbuttons
            });
        },

        render: function() {
            var s = "";
            s += this.render_headfoot();
            s += tableform.dialog_render(dialog);
            s += html.content_header(_("Online Forms"));
            s += html.info(_("Online forms can be linked to from your website and used to take information from visitors for applications, etc."));
            s += tableform.buttons_render(buttons);
            s += tableform.table_render(table);
            s += html.content_footer();
            return s;
        },

        bind: function() {
            tableform.dialog_bind(dialog);
            tableform.buttons_bind(buttons);
            tableform.table_bind(table, buttons);
            this.bind_headfoot();
            this.load_person_flags();
        }

    };
    
    common.module(onlineforms, "onlineforms", "formtab");

});
