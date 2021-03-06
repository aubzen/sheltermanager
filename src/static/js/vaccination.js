/*jslint browser: true, forin: true, eqeq: true, white: true, sloppy: true, vars: true, nomen: true */
/*global $, jQuery, _, asm, common, config, controller, dlgfx, edit_header, format, header, html, tableform, validate */

$(function() {

    var vaccination = {}, lastanimal;

    var dialog = {
        add_title: _("Add vaccination"),
        edit_title: _("Edit vaccination"),
        helper_text: _("Vaccinations need an animal and at least a required date."),
        close_on_ok: true,
        autofocus: false,
        use_default_values: false,
        columns: 1,
        width: 500,
        fields: [
            { json_field: "ANIMALID", post_field: "animal", label: _("Animal"), type: "animal", validation: "notzero" },
            { json_field: "VACCINATIONID", post_field: "type", label: _("Type"), type: "select", 
                options: { displayfield: "VACCINATIONTYPE", valuefield: "ID", rows: controller.vaccinationtypes }},
            { json_field: "DATEREQUIRED", post_field: "required", label: _("Required"), type: "date", validation: "notblank" },
            { json_field: "DATEOFVACCINATION", post_field: "given", label: _("Given"), type: "date" },
            { json_field: "COST", post_field: "cost", label: _("Cost"), type: "currency" },
            { json_field: "COMMENTS", post_field: "comments", label: _("Comments"), type: "textarea" }
        ]
    };

    var table = {
        rows: controller.rows,
        idcolumn: "ID",
        edit: function(row) {
            if (controller.animal) {
                $("#animal").closest("tr").hide();
            }
            vaccination.enable_default_cost = false;
            tableform.fields_populate_from_json(dialog.fields, row);
            vaccination.enable_default_cost = true;
            tableform.dialog_show_edit(dialog, row, function() {
                tableform.fields_update_row(dialog.fields, row);
                vaccination.set_extra_fields(row);
                tableform.fields_post(dialog.fields, "mode=update&vaccid=" + row.ID, controller.name, function(response) {
                    tableform.table_update(table);
                    tableform.dialog_close();
                },
                function(response) {
                    tableform.dialog_error(response);
                    tableform.dialog_enable_buttons();
                });
            });
        },
        complete: function(row) {
            if (row.DATEOFVACCINATION) { return true; }
            return false;
        },
        overdue: function(row) {
            return !row.DATEOFVACCINATION && format.date_js(row.DATEREQUIRED) < common.today_no_time();
        },
        columns: [
            { field: "VACCINATIONTYPE", display: _("Type") },
            { field: "IMAGE", display: "", 
                formatter: function(row) {
                    return '<a href="animal?id=' + row.ANIMALID + '"><img src=' + html.thumbnail_src(row, "animalthumb") + ' style="margin-right: 8px" class="asm-thumbnail thumbnailshadow" /></a>';
                },
                hideif: function(row) {
                    // Don't show this column if we're in an animal record, or the option is turned off
                    if (controller.animal || !config.bool("PicturesInBooks")) {
                        return true;
                    }
                }
            },
            { field: "ANIMAL", display: _("Animal"), 
                formatter: function(row) {
                    return '<a href="animal?id=' + row.ANIMALID + '">' + row.ANIMALNAME + ' - ' + row.SHELTERCODE + '</a>';
                },
                hideif: function(row) {
                    // Don't show for animal records
                    if (controller.animal) { return true; }
                }
            },
            { field: "LOCATIONNAME", display: _("Location"),
                formatter: function(row) {
                    var s = row.LOCATIONNAME;
                    if (row.LOCATIONUNIT) {
                        s += ' <span class="asm-search-locationunit">' + row.LOCATIONUNIT + '</span>';
                    }
                    return s;
                },
                hideif: function(row) {
                     // Don't show for animal records
                    if (controller.animal) { return true; }
                }
            },
            { field: "DATEREQUIRED", display: _("Required"), formatter: tableform.format_date, initialsort: true },
            { field: "DATEOFVACCINATION", display: _("Given"), formatter: tableform.format_date },
            { field: "COST", display: _("Cost"), formatter: tableform.format_currency },
            { field: "COMMENTS", display: _("Comments") }
        ]
    };

    var buttons = [
        { id: "new", text: _("New Vaccination"), icon: "new", enabled: "always", 
             click: function() { vaccination.new_vacc(); }},
         { id: "delete", text: _("Delete"), icon: "delete", enabled: "multi", 
             click: function() { 
                 tableform.delete_dialog(function() {
                     tableform.buttons_default_state(buttons);
                     var ids = tableform.table_ids(table);
                     common.ajax_post(controller.name, "mode=delete&ids=" + ids , function() {
                         tableform.table_remove_selected_from_json(table, controller.rows);
                         tableform.table_update(table);
                     });
                 });
             } 
         },
         { id: "complete", text: _("Give"), icon: "complete", enabled: "multi",
             click: function() {
                 var ids = tableform.table_ids(table);
                 common.ajax_post(controller.name, "mode=complete&ids=" + ids, function() {
                     $.each(controller.rows, function(i, v) {
                        if (tableform.table_id_selected(v.ID)) {
                            v.DATEOFVACCINATION = format.date_iso(new Date());
                        }
                     });
                     tableform.table_update(table);
                 });
             }
         },
         { id: "reschedule", text: _("Give and Reschedule"), icon: "calendar", enabled: "multi", type: "buttonmenu", options: controller.schedules,
            click: function(selval) {
                var ids = tableform.table_ids(table);
                common.ajax_post(controller.name, "mode=reschedule&ids=" + ids + "&duration=" + selval, function() {
                    window.location.reload();
                });
            }
         },
         { id: "required", text: _("Change Date Required"), icon: "calendar", enabled: "multi", 
             click: function() {
                $("#dialog-required").dialog("open");
             }
         },
         { id: "offset", type: "dropdownfilter", 
             options: [ "m31|" + _("Due today"), "p7|" + _("Due in next week"), "p31|" + _("Due in next month"), "p365|" + _("Due in next year") ],
             click: function(selval) {
                window.location = controller.name + "?offset=" + selval;
             },
             hideif: function(row) {
                 // Don't show for animal records
                 if (controller.animal) {
                     return true;
                 }
             }
         }
    ];

    vaccination = {

        render: function() {
            var s = "";
            s += tableform.dialog_render(dialog);
            s += vaccination.render_requireddialog();
            if (controller.animal) {
                s += edit_header.animal_edit_header(controller.animal, "vaccination", controller.tabcounts);
            }
            else {
                s += html.content_header(_("Vaccination Book"));
            }
            s += tableform.buttons_render(buttons);
            s += tableform.table_render(table);
            s += html.content_footer();
            return s;
        },

        render_requireddialog: function() {
            return [
                '<div id="dialog-required" style="display: none" title="' + html.title(_("Change Date Required")) + '">',
                '<table width="100%">',
                '<tr>',
                '<td><label for="newdate">' + _("Required") + '</label></td>',
                '<td><input id="newdate" data="newdate" type="textbox" class="asm-textbox asm-datebox" /></td>',
                '</tr>',
                '</table>',
                '</div>'
            ].join("\n");
        },

        new_vacc: function() { 
            if (controller.animal) {
                $("#animal").animalchooser("loadbyid", controller.animal.ID);
                $("#animal").closest("tr").hide();
            }
            else {
                $("#animal").animalchooser("clear");
            }
            $("#dialog-tableform .asm-textbox, #dialog-tableform .asm-textarea").val("");
            $("#type").select("value", config.str("AFDefaultVaccinationType"));
            vaccination.enable_default_cost = true;
            vaccination.set_default_cost();
            tableform.dialog_show_add(dialog, function() {
                tableform.fields_post(dialog.fields, "mode=create", controller.name, function(response) {
                    var row = {};
                    row.ID = response;
                    tableform.fields_update_row(dialog.fields, row);
                    vaccination.set_extra_fields(row);
                    controller.rows.push(row);
                    tableform.table_update(table);
                    tableform.dialog_close();
                }, function() {
                    tableform.dialog_enable_buttons();   
                });
            });
        },

        bind_requireddialog: function() {

            var requiredbuttons = { };
            requiredbuttons[_("Save")] = function() {
                $("#dialog-required label").removeClass("ui-state-error-text");
                if (!validate.notblank([ "newdate" ])) { return; }
                $("#dialog-required").disable_dialog_buttons();
                var ids = tableform.table_ids(table);
                var newdate = encodeURIComponent($("#newdate").val());
                common.ajax_post(controller.name, "mode=required&newdate=" + newdate + "&ids=" + ids , function() {
                    $.each(controller.rows, function(i, v) {
                        if (tableform.table_id_selected(v.ID)) {
                            v.DATEREQUIRED = format.date_iso($("#newdate").val());
                        }
                    });
                    tableform.table_update(table);
                    $("#dialog-required").dialog("close");
                    $("#dialog-required").enable_dialog_buttons();
                });
            };
            requiredbuttons[_("Cancel")] = function() {
                $("#dialog-required").dialog("close");
            };

            $("#dialog-required").dialog({
                autoOpen: false,
                width: 550,
                modal: true,
                dialogClass: "dialogshadow",
                show: dlgfx.edit_show,
                hide: dlgfx.edit_hide,
                buttons: requiredbuttons
            });

        },

        bind: function() {
            $(".asm-tabbar").asmtabs();
            tableform.dialog_bind(dialog);
            tableform.buttons_bind(buttons);
            tableform.table_bind(table, buttons);
            this.bind_requireddialog();

            // When the vacc type is changed, use the default cost from the vaccination type
            $("#type").change(vaccination.set_default_cost);

            // Remember the currently selected animal when it changes so we can add
            // its name and code to the local set
            $("#animal").bind("animalchooserchange", function(event, rec) { lastanimal = rec; });
            $("#animal").bind("animalchooserloaded", function(event, rec) { lastanimal = rec; });

            if (controller.newvacc == 1) {
                this.new_vacc();
            }
        },

        sync: function() {
            // If an offset is given in the querystring, update the select
            if (common.current_url().indexOf("offset=") != -1) {
                var offurl = common.current_url().substring(common.current_url().indexOf("=")+1);
                $("#offset").select("value", offurl);
            }
        },

        /** Whether or not we should allow overwriting of the cost */
        enable_default_cost: true,

        /** Sets the default cost based on the selected vaccination type */
        set_default_cost: function() {
            if (!vaccination.enable_default_cost) { return; }
            var seltype = $("#type").val();
            $.each(controller.vaccinationtypes, function(i, v) {
                if (seltype == v.ID) {
                    if (v.DEFAULTCOST) {
                        $("#cost").currency("value", v.DEFAULTCOST);
                    }
                    else {
                        $("#cost").currency("value", 0);
                    }
                    return true;
                }
            });
        },

        set_extra_fields: function(row) {
            if (controller.animal) {
                row.LOCATIONUNIT = controller.animal.SHELTERLOCATIONUNIT;
                row.LOCATIONNAME = controller.animal.SHELTERLOCATIONNAME;
                row.ANIMALNAME = controller.animal.ANIMALNAME;
                row.SHELTERCODE = controller.animal.SHELTERCODE;
                row.WEBSITEMEDIANAME = controller.animal.WEBSITEMEDIANAME;
            }
            else if (lastanimal) {
                row.LOCATIONUNIT = lastanimal.SHELTERLOCATIONUNIT;
                row.LOCATIONNAME = lastanimal.SHELTERLOCATIONNAME;
                row.ANIMALNAME = lastanimal.ANIMALNAME;
                row.SHELTERCODE = lastanimal.SHELTERCODE;
                row.WEBSITEMEDIANAME = lastanimal.WEBSITEMEDIANAME;
            }
            row.VACCINATIONTYPE = common.get_field(controller.vaccinationtypes, row.VACCINATIONID, "VACCINATIONTYPE");
        }
    };
    
    common.module(vaccination, "vaccination", controller.animal ? "formtab" : "book");

});
