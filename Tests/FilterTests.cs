using System;
using Xunit;
using QueryTree.Engine;
using System.Collections.Generic;

namespace QueryTree.Engine.Tests
{
    public class FilterTests
    {
        private string NodesJsonGreaterThan
		{
			get
			{
				return @"[
                    {
                        ""Id"": ""1"",
                        ""Type"": ""Data Table"",
                        ""Table"": ""employees""
                    },
                    {
                        ""Id"": ""2"",
                        ""Inputs"": [""1""],
                        ""Type"": ""Filter"",
                        ""FilterColumnIndex"": 0,
                        ""Operator"": ""GreaterThan"",
                        ""FilterValue1"": ""5""
                    }
                ]";
			}
		}

		private string NodesJsonLessThan
		{
			get
			{
				return @"[
                    {
                        ""Id"": ""1"",
                        ""Type"": ""Data Table"",
                        ""Table"": ""employees""
                    },
                    {
                        ""Id"": ""2"",
                        ""Inputs"": [""1""],
                        ""Type"": ""Filter"",
                        ""FilterColumnIndex"": 1,
                        ""Operator"": ""LessThanOrEqualTo"",
                        ""FilterValue1"": ""m""
                    }
                ]";
			}
		}

		private string NodesJsonComparisonColumn
		{
			get
			{
				return @"[
                    {
                        ""Id"": ""1"",
                        ""Type"": ""Data Table"",
                        ""Table"": ""employees""
                    },
                    {
                        ""Id"": ""2"",
                        ""Inputs"": [""1""],
                        ""Type"": ""Filter"",
                        ""FilterColumnIndex"": 1,
                        ""Operator"": ""EqualTo"",
                        ""FilterCompareColumnIndex"": ""2""
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
							new MockColumnInfo() { DataType = "varchar", Name = "Name" },
							new MockColumnInfo() { DataType = "varchar", Name = "Description" }
						}
					}
				};
			}
		}

		[Fact]
		public void TestGreaterThan()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonGreaterThan,
				DatabaseInfo);

			var sql = query.GetSql("2");

			Assert.True(sql.Contains("Column_0 > 5"), "SQL Value was: " + sql);
		}

		[Fact]
		public void TestLessThanOrEqualTo()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonLessThan,
				DatabaseInfo);

			var sql = query.GetSql("2");
			Assert.True(sql.Contains("Column_1 <= 'm'"), "SQL Value was: " + sql);
		}

		[Fact]
		public void TestComparisonColumn()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonComparisonColumn,
				DatabaseInfo);

			var sql = query.GetSql("2");
			Assert.True(sql.Contains("node_1.Column_1 = node_1.Column_2"), "SQL Value was: " + sql);
		}
    }
}
