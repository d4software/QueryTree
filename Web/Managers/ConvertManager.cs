using System;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Spreadsheet;
using QueryTree.ViewModels;

namespace QueryTree.Managers
{
    public class ConvertManager
    {
        
        private void PopulateData(QueryResponse data, SpreadsheetDocument spreadsheet)
        {
            Excel.AddWorksheet(spreadsheet, "Data");
            var worksheet = spreadsheet.WorkbookPart.WorksheetParts.First().Worksheet;

            // add header
            uint col = 1, row = 1;
            foreach (string column in data.Columns)
            {
                Excel.SetCellValue(spreadsheet, worksheet, col, row, column, false, false);
                
                //if (columnType == "datetime")
                //{
                //    using (ExcelRange range = ws.Cells[2, col, 1 + data.Rows.Count, col])
                //    {
                //        range.Style.Numberformat.Format = "dd/mm/yyyy hh:mm";
                //    }
               // }
                
                col++;
            }

            //using (ExcelRange range = ws.Cells[row, 1, row, col - 1])
            //{
            //    range.Style.Font.Bold = true;
            //}

            row++;

            foreach (var rowData in data.Rows)
            {
                col = 1;
                foreach (var cellData in rowData)
                {
                    if (cellData != null)
                    {
                        if (cellData is DateTime)
                        {
                            Excel.SetCellValue(spreadsheet, worksheet, col, row, (DateTime)cellData, 1, true);    
                        }
                        else if (cellData is Int32 || cellData is Double)
                        {
                            Excel.SetCellValue(spreadsheet, worksheet, col, row, Convert.ToDouble(cellData), null, true);
                        }
                        else 
                        {
                            Excel.SetCellValue(spreadsheet, worksheet, col, row, cellData.ToString(), false, false);
                        }
                    }
                    
                    col++;
                }

                row++;
            }

            worksheet.Save();
        }

        public byte[] ToExcel(QueryResponse data)
        {
            var stream = new MemoryStream();
            
            DocumentFormat.OpenXml.Packaging.SpreadsheetDocument spreadsheet;
            
            spreadsheet = Excel.CreateWorkbook(stream);
            
            Excel.AddBasicStyles(spreadsheet);
            
            PopulateData(data, spreadsheet);

            spreadsheet.Close();
            
            stream.Flush();

            return stream.ToArray();
        }
    }
}