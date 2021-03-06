/*jslint browser: true, forin: true, eqeq: true, white: true, sloppy: true, vars: true, nomen: true */
/*global $, jQuery, _, asm, common, config, controller, dlgfx, format, header, html, tableform, validate */

$(function() {

    var onlineform_incoming = {};

    var table = {
        rows: controller.rows,
        idcolumn: "COLLATIONID",
        edit: function(row) {
            header.show_loading(_("Loading..."));
            common.ajax_post("onlineform_incoming", "mode=view&collationid=" + row.COLLATIONID, function(result) {
                $("#dialog-viewer-content").html(result); 
                header.hide_loading();
                $("#dialog-viewer").dialog("open");
            }, function() {
                header.hide_loading();
            });
        },
        complete: function(row) {
            if (row.LINK) { return true; }
        },
        columns: [
            { field: "FORMNAME", display: _("Name") },
            { field: "POSTEDDATE", display: _("Received"), initialsort: true, initialsortdirection: "desc", formatter: tableform.format_datetime },
            { field: "HOST", display: _("From") },
            { field: "PREVIEW", display: _("Preview") },
            { field: "LINK", display: _("Link") }
        ]
    };

    var buttons = [
        { id: "delete", text: _("Delete"), icon: "delete", enabled: "multi", 
             click: function() { 
                 tableform.delete_dialog(function() {
                     tableform.buttons_default_state(buttons);
                     var ids = tableform.table_ids(table);
                     common.ajax_post("onlineform_incoming", "mode=delete&ids=" + ids , function() {
                         tableform.table_remove_selected_from_json(table, controller.rows);
                         tableform.table_update(table);
                     });
                 });
             } 
        },
        { id: "attachperson", text: _("Attach"), icon: "person-find", enabled: "one", tooltip: _("Attach this form to an existing person"), 
            click: function() {
                $("#dialog-attach").dialog("open");
            }
        },
        { id: "person", text: _("Person"), icon: "person-add", enabled: "multi", tooltip: _("Create person records from the selected forms"),
            click: function() {
                onlineform_incoming.create_record("person");
            }
        },
        { id: "lostanimal", text: _("Lost Animal"), icon: "animal-lost-add", enabled: "multi", tooltip: _("Create lost animal records from the selected forms"),
            click: function() {
                onlineform_incoming.create_record("lostanimal");
            }
        },
        { id: "foundanimal", text: _("Found Animal"), icon: "animal-found-add", enabled: "multi", tooltip: _("Create found animal records from the selected forms"),
            click: function() {
                onlineform_incoming.create_record("foundanimal");
            }
        },
        { id: "waitinglist", text: _("Waiting List"), icon: "waitinglist", enabled: "multi", tooltip: _("Create waiting list records from the selected forms"),
            click: function() {
                onlineform_incoming.create_record("waitinglist");
            }
        }
    ];

    onlineform_incoming = {

        render_viewer: function() {
            return [
                '<div id="dialog-viewer" style="display: none" title="' + html.title(_("View")) + '">',
                '<div id="dialog-viewer-content">',
                '</div>',
                '</div>'
            ].join("\n");
        },

        bind_viewer: function() {
            var viewbuttons = {};
            viewbuttons[_("Close")] = function() { $(this).dialog("close"); };
            $("#dialog-viewer").dialog({
                autoOpen: false,
                resizable: true,
                height: "auto",
                width: 600,
                modal: true,
                dialogClass: "dialogshadow",
                show: dlgfx.add_show,
                hide: dlgfx.add_hide,
                buttons: viewbuttons
            });
        },

        render_attach: function() {
            return [
                '<div id="dialog-attach" style="display: none" title="' + html.title(_("Select a person")) + '">',
                '<div class="ui-state-highlight ui-corner-all" style="margin-top: 20px; padding: 0 .7em">',
                '<p><span class="ui-icon ui-icon-info" style="float: left; margin-right: .3em;"></span>',
                _("Select a person to attach this form to."),
                '</p>',
                '</div>',
                html.capture_autofocus(),
                '<table width="100%">',
                '<tr>',
                '<td><label for="attachperson">' + _("Person") + '</label></td>',
                '<td>',
                '<input id="attachperson" data="attachperson" type="hidden" class="asm-personchooser" value="" />',
                '</td>',
                '</tr>',
                '</table>',
                '</div>'
            ].join("\n");
        },

        bind_attach: function() {
            var ab = {}; 
            ab[_("Attach")] = function() { 
                if (!validate.notblank(["attachperson"])) { return; }
                var formdata = "mode=attach&personid=" + $("#attachperson").val() + "&collationid=" + tableform.table_selected_row(table).COLLATIONID;
                common.ajax_post("onlineform_incoming", formdata, function() { 
                    var personname = $("#attachperson").closest("td").find(".asm-embed-name").html();
                    header.show_info(_("Successfully attached to {0}").replace("{0}", personname));
                    tableform.table_selected_row(table).LINK = 
                        '<a target="_blank" href="person_media?id=' + $("#attachperson").val() + '">' + personname + '</a>';
                    tableform.table_update(table);
                    $("#dialog-attach").dialog("close");
                });
            };
            ab[_("Cancel")] = function() { $(this).dialog("close"); };
            $("#dialog-attach").dialog({
                 autoOpen: false,
                 width: 600,
                 resizable: false,
                 modal: true,
                 dialogClass: "dialogshadow",
                 show: dlgfx.delete_show,
                 hide: dlgfx.delete_hide,
                 buttons: ab
            });
        },

        /**
         * Make an AJAX post to create a record.
         * mode: The type of record to create - person, lostanimal, foundanimal, waitinglist
         *       (also used to choose the url target for created records)
         */
        create_record: function(mode) {
             var ids = tableform.table_ids(table);
             common.ajax_post("onlineform_incoming", "mode=" + mode + "&ids=" + ids , function(result) {
                 var selrows = tableform.table_selected_rows(table);
                 $.each(selrows, function(i, v) {
                     $.each(result.split("^$"), function(ir, vr) {
                         var vb = vr.split("|");
                         if (vb[0] == v.COLLATIONID) {
                             v.LINK = '<a target="_blank" href="' + mode + '?id=' + vb[1] + '">' + vb[2] + '</a>';
                         }
                     });
                 });
                 tableform.table_update(table);
             });
        },

        render: function() {
            var s = "";
            s += this.render_viewer();
            s += this.render_attach();
            s += html.content_header(_("Incoming Forms"));
            s += html.info(_("Incoming forms are online forms that have been completed and submitted by people on the web.") + 
                "<br />" + _("You can use incoming forms to create new records or attach them to existing people."));
            s += tableform.buttons_render(buttons);
            s += tableform.table_render(table);
            s += html.content_footer();
            return s;
        },

        bind: function() {
            tableform.buttons_bind(buttons);
            tableform.table_bind(table, buttons);
            this.bind_viewer();
            this.bind_attach();
        }

    };

    common.module(onlineform_incoming, "onlineform_incoming", "formtab");

});
