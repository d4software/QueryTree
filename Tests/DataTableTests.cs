using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class DataTableTests
    {
        private string NodesJson
        {
            get 
            {
                return @"[
                    {
                        ""Id"": ""1"",
                        ""Type"": ""Data Table"",
                        ""Table"": ""employees""
                    }
                ]";
            }
        }

        private List<ITableInfo> DatabaseInfo
        {
            get 
            {
                return new List<ITableInfo>()
                {
                    new MockTableInfo()
                    {
                        DisplayName = "employees",
                        Columns = new List<IColumnInfo>()
                        {
                            new MockColumnInfo() { DataType = "int", Name = "ID" },
                            new MockColumnInfo() { DataType = "varchar", Name = "Name" }
                        }
                    }
                };
            }
        }

        [Fact]
        public void TestFromClause()
        {
            var query = new Query(
                DatabaseType.MySQL,
                NodesJson,
                DatabaseInfo);

            var sql = query.GetSql("1");

            Assert.True(sql.Contains("FROM `employees` AS"), "SQL Value was: " + sql);
        }

        [Fact]
        public void TestColumns()
        {
            var query = new Query(
                DatabaseType.MySQL,
                NodesJson,
                DatabaseInfo);

            var sql = query.GetSql("1");

            Assert.True(sql.Contains("`ID` AS "), "SQL Value was: " + sql);
            Assert.True(sql.Contains("`Name` AS "), "SQL Value was: " + sql);
        }
    }
}
