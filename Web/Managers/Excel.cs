using System.Linq;
using System.IO;
using System.Globalization;

namespace QueryTree.Managers
{
   /// <summary>
   /// Class to help to build an Excel workbook, credit to https://www.codeproject.com/Articles/371203/Creating-basic-Excel-workbook-with-Open-XML
   /// </summary>
   public static class Excel {

      /// <summary>
      /// Creates the workbook
      /// </summary>
      /// <returns>Spreadsheet created</returns>
      public static DocumentFormat.OpenXml.Packaging.SpreadsheetDocument CreateWorkbook(Stream stream) {
         DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadSheet = null;
         DocumentFormat.OpenXml.Packaging.SharedStringTablePart sharedStringTablePart;
         DocumentFormat.OpenXml.Packaging.WorkbookStylesPart workbookStylesPart;

        // Create the Excel workbook
        spreadSheet = DocumentFormat.OpenXml.Packaging.SpreadsheetDocument.Create(stream, DocumentFormat.OpenXml.SpreadsheetDocumentType.Workbook, false);

        // Create the parts and the corresponding objects

        // Workbook
        spreadSheet.AddWorkbookPart();
        spreadSheet.WorkbookPart.Workbook = new DocumentFormat.OpenXml.Spreadsheet.Workbook();
        spreadSheet.WorkbookPart.Workbook.Save();

        // Shared string table
        sharedStringTablePart = spreadSheet.WorkbookPart.AddNewPart<DocumentFormat.OpenXml.Packaging.SharedStringTablePart>();
        sharedStringTablePart.SharedStringTable = new DocumentFormat.OpenXml.Spreadsheet.SharedStringTable();
        sharedStringTablePart.SharedStringTable.Save();

        // Sheets collection
        spreadSheet.WorkbookPart.Workbook.Sheets = new DocumentFormat.OpenXml.Spreadsheet.Sheets();
        spreadSheet.WorkbookPart.Workbook.Save();

        // Stylesheet
        workbookStylesPart = spreadSheet.WorkbookPart.AddNewPart<DocumentFormat.OpenXml.Packaging.WorkbookStylesPart>();
        workbookStylesPart.Stylesheet = new DocumentFormat.OpenXml.Spreadsheet.Stylesheet();
        workbookStylesPart.Stylesheet.Save();
         
         return spreadSheet;
      }

      /// <summary>
      /// Adds a new worksheet to the workbook
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="name">Name of the worksheet</param>
      /// <returns>True if succesful</returns>
      public static bool AddWorksheet(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, string name) {
         DocumentFormat.OpenXml.Spreadsheet.Sheets sheets = spreadsheet.WorkbookPart.Workbook.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.Sheets>();
         DocumentFormat.OpenXml.Spreadsheet.Sheet sheet;
         DocumentFormat.OpenXml.Packaging.WorksheetPart worksheetPart;

         // Add the worksheetpart
         worksheetPart = spreadsheet.WorkbookPart.AddNewPart<DocumentFormat.OpenXml.Packaging.WorksheetPart>();
         worksheetPart.Worksheet = new DocumentFormat.OpenXml.Spreadsheet.Worksheet(new DocumentFormat.OpenXml.Spreadsheet.SheetData());
         worksheetPart.Worksheet.Save();

         // Add the sheet and make relation to workbook
         sheet = new DocumentFormat.OpenXml.Spreadsheet.Sheet() {
            Id = spreadsheet.WorkbookPart.GetIdOfPart(worksheetPart),
            SheetId = (uint)(spreadsheet.WorkbookPart.Workbook.Sheets.Count() + 1),
            Name = name
         };
         sheets.Append(sheet);
         spreadsheet.WorkbookPart.Workbook.Save();

         return true;
      }

      /// <summary>
      /// Adds the basic styles to the workbook
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <returns>True if succesful</returns>
      public static bool AddBasicStyles(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet) {
         DocumentFormat.OpenXml.Spreadsheet.Stylesheet stylesheet = spreadsheet.WorkbookPart.WorkbookStylesPart.Stylesheet;

         // Numbering formats (x:numFmts)
         stylesheet.InsertAt<DocumentFormat.OpenXml.Spreadsheet.NumberingFormats>(new DocumentFormat.OpenXml.Spreadsheet.NumberingFormats(), 0);
         // Currency
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.NumberingFormats>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.NumberingFormat>(
            new DocumentFormat.OpenXml.Spreadsheet.NumberingFormat() {
               NumberFormatId = 164,
               FormatCode = "#,##0.00"
               + "\\ \"" + System.Globalization.CultureInfo.CurrentUICulture.NumberFormat.CurrencySymbol + "\""
            }, 0);

         // Fonts (x:fonts)
         stylesheet.InsertAt<DocumentFormat.OpenXml.Spreadsheet.Fonts>(new DocumentFormat.OpenXml.Spreadsheet.Fonts(), 1);
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.Fonts>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.Font>(
            new DocumentFormat.OpenXml.Spreadsheet.Font() {
               FontSize = new DocumentFormat.OpenXml.Spreadsheet.FontSize() {
                  Val = 11
               },
               FontName = new DocumentFormat.OpenXml.Spreadsheet.FontName() {
                  Val = "Calibri"
               }
            }, 0);

         // Fills (x:fills)
         stylesheet.InsertAt<DocumentFormat.OpenXml.Spreadsheet.Fills>(new DocumentFormat.OpenXml.Spreadsheet.Fills(), 2);
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.Fills>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.Fill>(
            new DocumentFormat.OpenXml.Spreadsheet.Fill() {
               PatternFill = new DocumentFormat.OpenXml.Spreadsheet.PatternFill() {
                  PatternType = new DocumentFormat.OpenXml.EnumValue<DocumentFormat.OpenXml.Spreadsheet.PatternValues>() {
                     Value = DocumentFormat.OpenXml.Spreadsheet.PatternValues.None
                  }
               }
            }, 0);

         // Borders (x:borders)
         stylesheet.InsertAt<DocumentFormat.OpenXml.Spreadsheet.Borders>(new DocumentFormat.OpenXml.Spreadsheet.Borders(), 3);
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.Borders>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.Border>(
            new DocumentFormat.OpenXml.Spreadsheet.Border() {
               LeftBorder = new DocumentFormat.OpenXml.Spreadsheet.LeftBorder(),
               RightBorder = new DocumentFormat.OpenXml.Spreadsheet.RightBorder(),
               TopBorder = new DocumentFormat.OpenXml.Spreadsheet.TopBorder(),
               BottomBorder = new DocumentFormat.OpenXml.Spreadsheet.BottomBorder(),
               DiagonalBorder = new DocumentFormat.OpenXml.Spreadsheet.DiagonalBorder()
            }, 0);

         // Cell style formats (x:CellStyleXfs)
         stylesheet.InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellStyleFormats>(new DocumentFormat.OpenXml.Spreadsheet.CellStyleFormats(), 4);
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.CellStyleFormats>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellFormat>(
            new DocumentFormat.OpenXml.Spreadsheet.CellFormat() {
               NumberFormatId = 0,
               FontId = 0,
               FillId = 0,
               BorderId = 0
            }, 0);

         // Cell formats (x:CellXfs)
         stylesheet.InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellFormats>(new DocumentFormat.OpenXml.Spreadsheet.CellFormats(), 5);
         // General text
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.CellFormats>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellFormat>(
            new DocumentFormat.OpenXml.Spreadsheet.CellFormat() {
               FormatId = 0,
               NumberFormatId = 0
            }, 0);
         // Date
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.CellFormats>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellFormat>(
            new DocumentFormat.OpenXml.Spreadsheet.CellFormat() {
               ApplyNumberFormat = true,
               FormatId = 0,
               NumberFormatId = 22,
               FontId = 0,
               FillId = 0,
               BorderId = 0
            },
               1);
         // Currency
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.CellFormats>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellFormat>(
            new DocumentFormat.OpenXml.Spreadsheet.CellFormat() {
               ApplyNumberFormat = true,
               FormatId = 0,
               NumberFormatId = 164,
               FontId = 0,
               FillId = 0,
               BorderId = 0
            },
               2);
         // Percentage
         stylesheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.CellFormats>().InsertAt<DocumentFormat.OpenXml.Spreadsheet.CellFormat>(
            new DocumentFormat.OpenXml.Spreadsheet.CellFormat() {
               ApplyNumberFormat = true,
               FormatId = 0,
               NumberFormatId = 10,
               FontId = 0,
               FillId = 0,
               BorderId = 0
            },
               3);

         stylesheet.Save();

         return true;
      }

      /// <summary>
      /// Adds a list of strings to the shared strings table.
      /// </summary>
      /// <param name="spreadsheet">The spreadsheet</param>
      /// <param name="stringList">Strings to add</param>
      /// <returns></returns>
      public static bool AddSharedStrings(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, System.Collections.Generic.List<string> stringList) {
         foreach (string item in stringList) {
            Excel.AddSharedString(spreadsheet, item, false);
         }
         spreadsheet.WorkbookPart.SharedStringTablePart.SharedStringTable.Save();

         return true;
      }

      /// <summary>
      /// Add a single string to shared strings table.
      /// Shared string table is created if it doesn't exist.
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="stringItem">string to add</param>
      /// <param name="save">Save the shared string table</param>
      /// <returns></returns>
      public static bool AddSharedString(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, string stringItem, bool save = true) {
         DocumentFormat.OpenXml.Spreadsheet.SharedStringTable sharedStringTable = spreadsheet.WorkbookPart.SharedStringTablePart.SharedStringTable;

         if (0 == sharedStringTable.Where(item => item.InnerText == stringItem).Count()) {
            sharedStringTable.AppendChild(
               new DocumentFormat.OpenXml.Spreadsheet.SharedStringItem(
                  new DocumentFormat.OpenXml.Spreadsheet.Text(stringItem)));

            // Save the changes
            if (save) {
               sharedStringTable.Save();
            }
         }

         return true;
      }
      /// <summary>
      /// Returns the index of a shared string.
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="stringItem">String to search for</param>
      /// <returns>Index of a shared string. -1 if not found</returns>
      public static int IndexOfSharedString(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, string stringItem) {
         DocumentFormat.OpenXml.Spreadsheet.SharedStringTable sharedStringTable = spreadsheet.WorkbookPart.SharedStringTablePart.SharedStringTable;
         bool found = false;
         int index = 0;

         foreach (DocumentFormat.OpenXml.Spreadsheet.SharedStringItem sharedString in sharedStringTable.Elements<DocumentFormat.OpenXml.Spreadsheet.SharedStringItem>()) {
            if (sharedString.InnerText == stringItem) {
               found = true;
               break; ;
            }
            index++;
         }

         return found ? index : -1;
      }

      /// <summary>
      /// Converts a column number to column name (i.e. A, B, C..., AA, AB...)
      /// </summary>
      /// <param name="columnIndex">Index of the column</param>
      /// <returns>Column name</returns>
      public static string ColumnNameFromIndex(uint columnIndex) {
         uint remainder;
         string columnName = "";

         while (columnIndex > 0) {
            remainder = (columnIndex - 1) % 26;
            columnName = System.Convert.ToChar(65 + remainder).ToString() + columnName;
            columnIndex = (uint)((columnIndex - remainder) / 26);
         }

         return columnName;
      }

      /// <summary>
      /// Sets a string value to a cell
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="worksheet">Worksheet to use</param>
      /// <param name="columnIndex">Index of the column</param>
      /// <param name="rowIndex">Index of the row</param>
      /// <param name="stringValue">String value to set</param>
      /// <param name="useSharedString">Use shared strings? If true and the string isn't found in shared strings, it will be added</param>
      /// <param name="save">Save the worksheet</param>
      /// <returns>True if succesful</returns>
      public static bool SetCellValue(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, DocumentFormat.OpenXml.Spreadsheet.Worksheet worksheet, uint columnIndex, uint rowIndex, string stringValue, bool useSharedString, bool save = true) {
         string columnValue = stringValue;
         DocumentFormat.OpenXml.Spreadsheet.CellValues cellValueType;

         // Add the shared string if necessary
         if (useSharedString) {
            if (Excel.IndexOfSharedString(spreadsheet, stringValue) == -1) {
               Excel.AddSharedString(spreadsheet, stringValue, true);
            }
            columnValue = Excel.IndexOfSharedString(spreadsheet, stringValue).ToString();
            cellValueType = DocumentFormat.OpenXml.Spreadsheet.CellValues.SharedString;
         } else {
            cellValueType = DocumentFormat.OpenXml.Spreadsheet.CellValues.String;
         }

         return SetCellValue(spreadsheet, worksheet, columnIndex, rowIndex, cellValueType, columnValue, null, save);
      }

      /// <summary>
      /// Sets a cell value with a date
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="worksheet">Worksheet to use</param>
      /// <param name="columnIndex">Index of the column</param>
      /// <param name="rowIndex">Index of the row</param>
      /// <param name="datetimeValue">DateTime value</param>
      /// <param name="styleIndex">Style to use</param>
      /// <param name="save">Save the worksheet</param>
      /// <returns>True if succesful</returns>
      public static bool SetCellValue(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, DocumentFormat.OpenXml.Spreadsheet.Worksheet worksheet, uint columnIndex, uint rowIndex, System.DateTime datetimeValue, uint? styleIndex, bool save = true) {
          var columnValue = datetimeValue.ToOADate().ToString(CultureInfo.InvariantCulture);
          return SetCellValue(spreadsheet, worksheet, columnIndex, rowIndex, DocumentFormat.OpenXml.Spreadsheet.CellValues.Date, columnValue, styleIndex, save);
      }

      /// <summary>
      /// Sets a cell value with double number
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="worksheet">Worksheet to use</param>
      /// <param name="columnIndex">Index of the column</param>
      /// <param name="rowIndex">Index of the row</param>
      /// <param name="doubleValue">Double value</param>
      /// <param name="styleIndex">Style to use</param>
      /// <param name="save">Save the worksheet</param>
      /// <returns>True if succesful</returns>
      public static bool SetCellValue(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, DocumentFormat.OpenXml.Spreadsheet.Worksheet worksheet, uint columnIndex, uint rowIndex, double doubleValue, uint? styleIndex, bool save = true) {
#if EN_US_CULTURE
         string columnValue = doubleValue.ToString();
#else
         string columnValue = doubleValue.ToString().Replace(",", ".");
#endif

         return SetCellValue(spreadsheet, worksheet, columnIndex, rowIndex, DocumentFormat.OpenXml.Spreadsheet.CellValues.Number, columnValue, styleIndex, save);
      }

      /// <summary>
      /// Sets a cell value with boolean value
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="worksheet">Worksheet to use</param>
      /// <param name="columnIndex">Index of the column</param>
      /// <param name="rowIndex">Index of the row</param>
      /// <param name="boolValue">Boolean value</param>
      /// <param name="styleIndex">Style to use</param>
      /// <param name="save">Save the worksheet</param>
      /// <returns>True if succesful</returns>
      public static bool SetCellValue(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, DocumentFormat.OpenXml.Spreadsheet.Worksheet worksheet, uint columnIndex, uint rowIndex, bool boolValue, uint? styleIndex, bool save = true) {
         string columnValue = boolValue ? "1" : "0";

         return SetCellValue(spreadsheet, worksheet, columnIndex, rowIndex, DocumentFormat.OpenXml.Spreadsheet.CellValues.Boolean, columnValue, styleIndex, save);
      }


      /// <summary>
      /// Sets the column width
      /// </summary>
      /// <param name="worksheet">Worksheet to use</param>
      /// <param name="columnIndex">Index of the column</param>
      /// <param name="width">Width to set</param>
      /// <returns>True if succesful</returns>
      public static bool SetColumnWidth(DocumentFormat.OpenXml.Spreadsheet.Worksheet worksheet, int columnIndex, int width) {
         DocumentFormat.OpenXml.Spreadsheet.Columns columns;
         DocumentFormat.OpenXml.Spreadsheet.Column column;

         // Get the column collection exists
         columns = worksheet.Elements<DocumentFormat.OpenXml.Spreadsheet.Columns>().FirstOrDefault();
         if (columns == null) {
            return false;
         }
         // Get the column
         column = columns.Elements<DocumentFormat.OpenXml.Spreadsheet.Column>().Where(item => item.Min == columnIndex).FirstOrDefault();
         if (columns == null) {
            return false;
         }
         column.Width = width;
         column.CustomWidth = true;

         worksheet.Save();

         return true;
      }

      /// <summary>
      /// Sets a cell value. The row and the cell are created if they do not exist. If the cell exists, the contents of the cell is overwritten
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="worksheet">Worksheet to use</param>
      /// <param name="columnIndex">Index of the column</param>
      /// <param name="rowIndex">Index of the row</param>
      /// <param name="valueType">Type of the value</param>
      /// <param name="value">The actual value</param>
      /// <param name="styleIndex">Index of the style to use. Null if no style is to be defined</param>
      /// <param name="save">Save the worksheet?</param>
      /// <returns>True if succesful</returns>
      private static bool SetCellValue(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, DocumentFormat.OpenXml.Spreadsheet.Worksheet worksheet, uint columnIndex, uint rowIndex, DocumentFormat.OpenXml.Spreadsheet.CellValues valueType, string value, uint? styleIndex, bool save = true) {
         DocumentFormat.OpenXml.Spreadsheet.SheetData sheetData = worksheet.GetFirstChild<DocumentFormat.OpenXml.Spreadsheet.SheetData>();
         DocumentFormat.OpenXml.Spreadsheet.Row row;
         DocumentFormat.OpenXml.Spreadsheet.Row previousRow = null;
         DocumentFormat.OpenXml.Spreadsheet.Cell cell;
         DocumentFormat.OpenXml.Spreadsheet.Cell previousCell = null;
         DocumentFormat.OpenXml.Spreadsheet.Columns columns;
         DocumentFormat.OpenXml.Spreadsheet.Column previousColumn = null;
         string cellAddress = Excel.ColumnNameFromIndex(columnIndex) + rowIndex;

         // Check if the row exists, create if necessary
         if (sheetData.Elements<DocumentFormat.OpenXml.Spreadsheet.Row>().Where(item => item.RowIndex == rowIndex).Count() != 0) {
            row = sheetData.Elements<DocumentFormat.OpenXml.Spreadsheet.Row>().Where(item => item.RowIndex == rowIndex).First();
         } else {
            row = new DocumentFormat.OpenXml.Spreadsheet.Row() { RowIndex = rowIndex };
            //sheetData.Append(row);
            for (uint counter = rowIndex - 1; counter > 0; counter--) {
               previousRow = sheetData.Elements<DocumentFormat.OpenXml.Spreadsheet.Row>().Where(item => item.RowIndex == counter).FirstOrDefault();
               if (previousRow != null) {
                  break;
               }
            }
            sheetData.InsertAfter(row, previousRow);
         }

         // Check if the cell exists, create if necessary
         if (row.Elements<DocumentFormat.OpenXml.Spreadsheet.Cell>().Where(item => item.CellReference.Value == cellAddress).Count() > 0) {
            cell = row.Elements<DocumentFormat.OpenXml.Spreadsheet.Cell>().Where(item => item.CellReference.Value == cellAddress).First();
         } else {
            // Find the previous existing cell in the row
            for (uint counter = columnIndex - 1; counter > 0; counter--) {
               previousCell = row.Elements<DocumentFormat.OpenXml.Spreadsheet.Cell>().Where(item => item.CellReference.Value == Excel.ColumnNameFromIndex(counter) + rowIndex).FirstOrDefault();
               if (previousCell != null) {
                  break;
               }
            }
            cell = new DocumentFormat.OpenXml.Spreadsheet.Cell() { CellReference = cellAddress };
            row.InsertAfter(cell, previousCell);
         }

         // Check if the column collection exists
         columns = worksheet.Elements<DocumentFormat.OpenXml.Spreadsheet.Columns>().FirstOrDefault();
         if (columns == null) {
            columns = worksheet.InsertAt(new DocumentFormat.OpenXml.Spreadsheet.Columns(), 0);
         }
         // Check if the column exists
         if (columns.Elements<DocumentFormat.OpenXml.Spreadsheet.Column>().Where(item => item.Min == columnIndex).Count() == 0) {
            // Find the previous existing column in the columns
            for (uint counter = columnIndex - 1; counter > 0; counter--) {
               previousColumn = columns.Elements<DocumentFormat.OpenXml.Spreadsheet.Column>().Where(item => item.Min == counter).FirstOrDefault();
               if (previousColumn != null) {
                  break;
               }
            }
            columns.InsertAfter(
               new DocumentFormat.OpenXml.Spreadsheet.Column() {
                  Min = columnIndex,
                  Max = columnIndex,
                  CustomWidth = true,
                  Width = 9
               }, previousColumn);
         }

         // Add the value
         cell.CellValue = new DocumentFormat.OpenXml.Spreadsheet.CellValue(value);
         if (styleIndex != null) {
            cell.StyleIndex = styleIndex;
         }
         if (valueType != DocumentFormat.OpenXml.Spreadsheet.CellValues.Date) {
            cell.DataType = new DocumentFormat.OpenXml.EnumValue<DocumentFormat.OpenXml.Spreadsheet.CellValues>(valueType);
         }

         if (save) {
            worksheet.Save();
         }

         return true;
      }

      /// <summary>
      /// Adds a predefined style from the given xml
      /// </summary>
      /// <param name="spreadsheet">Spreadsheet to use</param>
      /// <param name="xml">Style definition as xml</param>
      /// <returns>True if succesful</returns>
      public static bool AddPredefinedStyles(DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet, string xml) {
         spreadsheet.WorkbookPart.WorkbookStylesPart.Stylesheet.InnerXml = xml;
         spreadsheet.WorkbookPart.WorkbookStylesPart.Stylesheet.Save();

         return true;
      }
   }
}
