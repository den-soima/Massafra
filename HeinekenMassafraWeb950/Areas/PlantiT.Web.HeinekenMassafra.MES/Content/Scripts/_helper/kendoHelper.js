/* Helper for Kendo Operations */
angular.module('app.kendoHelper', [])
  .factory("kendoHelper", function () {
    return {
      // ---------------------------   
      // Filter setzen
      setDataSourceFilters: function (dataSource, filterField, filterOperator, filterValue) {

        if (!dataSource || !filterField || !filterOperator)
          return;

        // Aktuelles Filterobjekt holen
        var actFilterObject = dataSource.filter();

        // Aktuelle Filter holen   
        var actFilters = (actFilterObject) ? actFilterObject.filters : [];

        var hasFilter = false;
        // Filter entfernen bei gleichen Feld/Operator 
        if (actFilters && actFilters.length > 0) {
          for (var i = 0; i < actFilters.length; i++) {
            if ((actFilters[i].field == filterField && actFilters[i].operator == filterOperator) ||
                (actFilters[i].field == filterField && filterValue == undefined)) {
              actFilters.splice(i, 1);
            }
          }
        }

        // neuen Filter einfügen  
        if (filterValue != undefined) {
          actFilters.push({
            field: filterField,
            operator: filterOperator,
            value: filterValue
          });
        }

        // Filter setzen
        dataSource.filter({
          logic: "and",
          filters: actFilters
        });

        actFilterObject = undefined;
      },

      // ---------------------------   
      // Sortierung setzen
      setDataSourceSorts: function (dataSource, sortField, sortDir) {

        if (!dataSource || !sortField)
          return;

        //// Aktuelle Sortierung holen
        //var actsortObject = dataSource.sort();
        var actsorts = new Array();
        //if (actsortObject && actsortObject.length > 0)
        //  actsorts = actsortObject.sorts;

        // Sortierung der Datenquelle ablöschen
        dataSource.sort({});


        //// Sortierung entfernen bei gleichen Feld
        //if (actsorts && actsorts.length > 0) {
        //  for (var i = 0; i < actsorts.length; i++) {
        //    if (actsorts[i].field == sortField) {
        //      actsorts.splice(i, 1);
        //    }
        //  }
        //}
        //else {
        //  actsorts = [];
        //}

        // Sortierung einfügen    
        if (sortDir != undefined) {
          actsorts.push({
            field: sortField,
            dir: sortDir
          });
        }


        // Sortierung der Datenquelle zuweisen
        if (actsorts && actsorts.length > 0) {
          // Sortierung setzen
          dataSource._sort = actsorts;
        }
      },

      // ---------------------------
      // Bearbeitungsbit setzen
      setValue: function (dataItem, grid, field, value) {
        if (!grid)
          return;

        // Find comment Column Position
        var colCommentIndex = undefined;
        for (i = 0; i < grid.columns.length; i++) {
          if (grid.columns[i].field == field) {
            colCommentIndex = i + 2; // offset
            break;
          }
        }


        if (colCommentIndex) {
          var row = grid
              .tbody
              .find("tr[data-uid='" + dataItem.uid + "']");


          if (row) {
            // set red mark
            var cell = row.find("td:nth-child(" + (colCommentIndex + grid.dataSource.Groupp().length) + ")");
            // change value
            if (!!cell) {
              // Kommentaränderung im Grid   
              var item = grid.dataSource.get(dataItem._Key);
              dataItem.set(field, value);

              // set column to dirty for update
              item.dirty = true;
              if (item.hasOwnProperty('_Kendo_SaveIt'))
                item._Kendo_SaveIt = true;  
            }
          }
        }
      },

      // ---------------------------
      // Wert der Checkbox setzen
      setChangeBit: function (dataItem, grid, field) {           
        if (!grid) 
          return;

        // Find comment Column Position
        var colCommentIndex = undefined;
        for (i = 0; i < grid.columns.length; i++) {
          if (grid.columns[i].field == field) {
            colCommentIndex = i + 2; // offset
            break;
          }
        }


        if (colCommentIndex) {  
          var row = grid
              .tbody
              .find("tr[data-uid='" + dataItem.uid + "']");


          if (row) {
            // set red mark
            var cell = row.find("td:nth-child(" + (colCommentIndex + grid.dataSource.Groupp().length) + ")");
            if (!!cell && !cell.hasClass("k-dirty-cell ng-scope")) {
              cell.html("<span class='k-dirty'></span>" + cell.html());
              cell.addClass("k-dirty-cell ng-scope");
            }
          }
        }
      },

      // ---------------------------
      // CheckBox Änderung
      setCheckBoxChange: function (dataItem, grid, field, value) {
        if (!grid) 
          return;
                   

        var item = grid.dataSource.get(dataItem._Key);
                       
        // Find comment Column Position
        var colCommentIndex = undefined;
        for (i = 0; i < grid.columns.length; i++) {
          if (grid.columns[i].field == field) {
            colCommentIndex = i + 2; // offset
            break;
          }
        }

        if (item && colCommentIndex) {
          var row = grid
              .tbody
              .find("tr[data-uid='" + dataItem.uid + "']");

          if (row) {
            // set red mark
            var cell = row.find("td:nth-child(" + (colCommentIndex + grid.dataSource.Groupp().length) + ")");
            if (cell && !cell.hasClass("k-dirty-cell ng-scope")) {
              cell.html("<span class='k-dirty'></span>" + cell.html());
              cell.addClass("k-dirty-cell ng-scope");
            }
            // change check state
            if (cell) {
              var cellInput = cell.find("input");
              if (cellInput) {
                if (value) {
                  if (!cellInput.prop("checked"))
                    cellInput.prop("checked", "true");
                }
                else
                  cellInput.removeAttr("checked");
              }
            }

          }
        }
      },

      // ---------------------------
      // Editor - DateTime
      getEditorDateTime: function (container, options) {
        $('<input name="' + options.field + '"/>')
                .appendTo(container)
                .kendoDateTimePicker({
                  format: "yyyy-MM-dd HH:mm",
                  timeFormat: "HH:mm",
                  interval: 5
                })
      },

      // ---------------------------
      // Editor - Numeric
      getEditorNumeric: function (container, options) {
        $('<input name="' + options.field + '"/>')
                .appendTo(container)
                .kendoNumericTextBox({
                  format: "{0:n3}",
                  decimals: 3,
                  step: 0.001
                });
      },

      
      // ---------------------------
      // Updates a single row in a kendo grid without firing a databound event.
      // This is needed since otherwise the entire grid will be redrawn.
      // http://stackoverflow.com/questions/13613098/refresh-a-single-kendo-grid-row 
      fastRedrawGridRow: function (grid, row) {
        var dataItem = grid.dataItem(row);

        var rowChildren = $(row).children('td[role="gridcell"]');

        for (var i = 0; i < grid.columns.length; i++) {

          var column = grid.columns[i];
          var template = column.template;
          var cell = rowChildren.eq(i);

          if (template !== undefined) {
            var kendoTemplate = kendo.template(template);

            // Render using template
            cell.html(kendoTemplate(dataItem));
          } else {
            var fieldValue = dataItem[column.field];

            var format = column.format;
            var values = column.values;

            if (values !== undefined && values != null) {
              // use the text value mappings (for enums)
              for (var j = 0; j < values.length; j++) {
                var value = values[j];
                if (value.value == fieldValue) {
                  cell.html(value.text);
                  break;
                }
              }
            } else if (format !== undefined) {
              // use the format
              cell.html(kendo.format(format, fieldValue));
            } else {
              // Just dump the plain old value
              cell.html(fieldValue);
            }
          }
        }
      },



      // ---------------------------
      // Wandelt Zeit in UTC Zeitstempel um
      getUTCDate: function (date) {
        var month = date.getUTCMonth() + 1;
        var day = date.getUTCDate();
        var hour = date.getUTCHours();
        var minutes = date.getUTCMinutes();
        var seconds = date.getUTCSeconds();  

        month = ((month < 10) ? "0" + month : month);
        day = ((day < 10) ? "0" + day : day);
        hour = ((hour < 10) ? "0" + hour : hour);
        minutes = ((minutes < 10) ? "0" + minutes : minutes);
        seconds = ((seconds < 10) ? "0" + seconds : seconds);      

          var _date = date.getUTCFullYear() + "-" + month + "-" + day + "T" + hour + ":" + minutes + ":" + seconds + "Z";
        return _date;
      },

      // ---------------------------
      // Wandelt Zeit in lokalen Zeitstempel um
        getDate: function (date) {


        var month = date.getMonth() + 1;
        var day = date.getDate();
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var offset = date.getTimezoneOffset();

        month = ((month < 10) ? "0" + month : month);
        day = ((day < 10) ? "0" + day : day);
        hour = ((hour < 10) ? "0" + hour : hour);
        minutes = ((minutes < 10) ? "0" + minutes : minutes);
        seconds = ((seconds < 10) ? "0" + seconds : seconds);

        var _offset = 'Z';

        if (offset != 0)
        {
          _offset = ((offset < 0) ? "+" : "-");

          // Negativzeichen entfernen
          offset = (offset < 0) ? (offset * -1) : offset;

          // String bauen
          _offset += ((Math.floor(offset / 60) < 10) ? ("0" + Math.floor(offset / 60)) : Math.floor(offset / 60)) + ":" +
                     ((offset % 60 < 10) ? ("0" + offset % 60) : (offset % 60));
        }

        var _date = date.getUTCFullYear() + "-" + month + "-" + day + "T" + hour + ":" + minutes + ":" + seconds + _offset;
        return _date;
      },

      // ---------------------------
      // Wandelt Zeit in C Sharp Format um
      getDateCSharp: function (date) {
        var month = date.getMonth() + 1;
        var day = date.getDate();
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var offset = date.getTimezoneOffset();

        month = ((month < 10) ? "0" + month : month);
        day = ((day < 10) ? "0" + day : day);
        hour = ((hour < 10) ? "0" + hour : hour);
        minutes = ((minutes < 10) ? "0" + minutes : minutes);
        seconds = ((seconds < 10) ? "0" + seconds : seconds);

        var _date = date.getUTCFullYear() + "/" + month + "/" + day + " " + hour + ":" + minutes + ":" + seconds;
        return _date;
      },
    }
  });
