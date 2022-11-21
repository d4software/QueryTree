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
                        ""FilterValue1"": 5
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

		private string NodesJsonBoolNotEqual
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
                        ""FilterColumnIndex"": 3,
                        ""Operator"": ""DoesNotEqual"",
                        ""FilterValue1"": ""0""
                    }
                ]";
			}
		}
		
		private string NodesJsonGreaterThanDate
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
                        ""FilterColumnIndex"": 4,
                        ""Operator"": ""GreaterThan"",
                        ""FilterValue1"": ""2017-01-01 00:00""
                    }
                ]";
			}
		}

		private string NodesJsonLastNDays
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
                        ""FilterColumnIndex"": 4,
                        ""Operator"": ""LastNDays"",
                        ""FilterValue1"": ""365""
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
							new MockColumnInfo() { DataType = "varchar", Name = "Description" },
							new MockColumnInfo() { DataType = "boolean", Name = "IsActive" },
							new MockColumnInfo() { DataType = "timestamp", Name = "CreatedAt" }
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

		[Fact]
		public void TestPostgresBoolNotEqual()
		{
			var query = new Query(
				DatabaseType.PostgreSQL,
				NodesJsonBoolNotEqual,
				DatabaseInfo);

			var sql = query.GetSql("2");
			Assert.True(sql.Contains("node_1.Column_3 <> FALSE"), "SQL Value was: " + sql);
		}


		[Fact]
		public void TestTimestampGreaterThan()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonGreaterThanDate,
				DatabaseInfo);

			var sql = query.GetSql("2");
			Assert.True(sql.Contains("node_1.Column_4 > '2017-01-01 00:00'"), "SQL Value was: " + sql);
		}

		[Fact]
		public void TestLastNDays()
		{
			var query = new Query(
				DatabaseType.MySQL,
				NodesJsonLastNDays,
				DatabaseInfo);

			var sql = query.GetSql("2");
			Assert.True(sql.Contains("DATEDIFF(node_1.Column_4 , NOW()) BETWEEN -365 AND -1"), "SQL Value was: " + sql);
		}
    }
}
