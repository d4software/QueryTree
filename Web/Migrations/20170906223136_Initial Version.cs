using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Web.Migrations
{
    public partial class InitialVersion : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AspNetRoles",
                columns: table => new
                {
                    Id = table.Column<string>(nullable: false),
                    ConcurrencyStamp = table.Column<string>(nullable: true),
                    Name = table.Column<string>(maxLength: 256, nullable: true),
                    NormalizedName = table.Column<string>(maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserTokens",
                columns: table => new
                {
                    UserId = table.Column<string>(nullable: false),
                    LoginProvider = table.Column<string>(nullable: false),
                    Name = table.Column<string>(nullable: false),
                    Value = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name });
                });

            migrationBuilder.CreateTable(
                name: "Organisations",
                columns: table => new
                {
                    OrganisationId = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    CreatedOn = table.Column<DateTime>(nullable: false),
                    NumberOfConnections = table.Column<int>(nullable: false),
                    NumberOfUsers = table.Column<int>(nullable: false),
                    OrganisationName = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Organisations", x => x.OrganisationId);
                });

            migrationBuilder.CreateTable(
                name: "AspNetRoleClaims",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    ClaimType = table.Column<string>(nullable: true),
                    ClaimValue = table.Column<string>(nullable: true),
                    RoleId = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetRoleClaims_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUsers",
                columns: table => new
                {
                    Id = table.Column<string>(nullable: false),
                    AccessFailedCount = table.Column<int>(nullable: false),
                    ConcurrencyStamp = table.Column<string>(nullable: true),
                    Discriminator = table.Column<string>(nullable: false),
                    Email = table.Column<string>(maxLength: 256, nullable: true),
                    EmailConfirmed = table.Column<bool>(nullable: false),
                    LockoutEnabled = table.Column<bool>(nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(nullable: true),
                    NormalizedEmail = table.Column<string>(maxLength: 256, nullable: true),
                    NormalizedUserName = table.Column<string>(maxLength: 256, nullable: true),
                    PasswordHash = table.Column<string>(nullable: true),
                    PhoneNumber = table.Column<string>(nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(nullable: false),
                    SecurityStamp = table.Column<string>(nullable: true),
                    TwoFactorEnabled = table.Column<bool>(nullable: false),
                    UserName = table.Column<string>(maxLength: 256, nullable: true),
                    CreatedOn = table.Column<DateTime>(nullable: true),
                    FirstName = table.Column<string>(nullable: true),
                    LastName = table.Column<string>(nullable: true),
                    OrganisationId = table.Column<int>(nullable: true),
                    UserId = table.Column<int>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUsers_Organisations_OrganisationId",
                        column: x => x.OrganisationId,
                        principalTable: "Organisations",
                        principalColumn: "OrganisationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserClaims",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    ClaimType = table.Column<string>(nullable: true),
                    ClaimValue = table.Column<string>(nullable: true),
                    UserId = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AspNetUserClaims_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserLogins",
                columns: table => new
                {
                    LoginProvider = table.Column<string>(nullable: false),
                    ProviderKey = table.Column<string>(nullable: false),
                    ProviderDisplayName = table.Column<string>(nullable: true),
                    UserId = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey });
                    table.ForeignKey(
                        name: "FK_AspNetUserLogins_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AspNetUserRoles",
                columns: table => new
                {
                    UserId = table.Column<string>(nullable: false),
                    RoleId = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetRoles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "AspNetRoles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AspNetUserRoles_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrganisationInvites",
                columns: table => new
                {
                    OrganisationInviteId = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    AcceptedOn = table.Column<DateTime>(nullable: true),
                    CreatedById = table.Column<string>(nullable: true),
                    CreatedOn = table.Column<DateTime>(nullable: false),
                    InviteEmail = table.Column<string>(nullable: true),
                    OrganisationId = table.Column<int>(nullable: false),
                    RejectedOn = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganisationInvites", x => x.OrganisationInviteId);
                    table.ForeignKey(
                        name: "FK_OrganisationInvites_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SshKeyFiles",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    ContentType = table.Column<string>(nullable: true),
                    CreatedById = table.Column<string>(nullable: true),
                    CreatedOn = table.Column<DateTime>(nullable: false),
                    Filename = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SshKeyFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SshKeyFiles_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DatabaseConnections",
                columns: table => new
                {
                    DatabaseConnectionID = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    CreatedOn = table.Column<DateTime>(nullable: false),
                    DatabaseName = table.Column<string>(nullable: false),
                    Description = table.Column<string>(nullable: true),
                    Name = table.Column<string>(nullable: false),
                    OrganisationId = table.Column<int>(nullable: false),
                    Port = table.Column<int>(nullable: false),
                    Server = table.Column<string>(nullable: false),
                    SshKeyFileID = table.Column<int>(nullable: true),
                    SshPort = table.Column<int>(nullable: true),
                    SshUsername = table.Column<string>(nullable: true),
                    Type = table.Column<int>(nullable: false),
                    UseSsh = table.Column<bool>(nullable: false),
                    UseSshKey = table.Column<bool>(nullable: false),
                    Username = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DatabaseConnections", x => x.DatabaseConnectionID);
                    table.ForeignKey(
                        name: "FK_DatabaseConnections_Organisations_OrganisationId",
                        column: x => x.OrganisationId,
                        principalTable: "Organisations",
                        principalColumn: "OrganisationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DatabaseConnections_SshKeyFiles_SshKeyFileID",
                        column: x => x.SshKeyFileID,
                        principalTable: "SshKeyFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Queries",
                columns: table => new
                {
                    QueryID = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    CreatedById = table.Column<string>(nullable: true),
                    CreatedOn = table.Column<DateTime>(nullable: true),
                    DatabaseConnectionID = table.Column<int>(nullable: false),
                    Description = table.Column<string>(nullable: true),
                    IsSimpleQuery = table.Column<bool>(nullable: false),
                    LastEditedById = table.Column<string>(nullable: true),
                    LastEditedOn = table.Column<DateTime>(nullable: true),
                    Name = table.Column<string>(nullable: true),
                    QueryDefinition = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Queries", x => x.QueryID);
                    table.ForeignKey(
                        name: "FK_Queries_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Queries_DatabaseConnections_DatabaseConnectionID",
                        column: x => x.DatabaseConnectionID,
                        principalTable: "DatabaseConnections",
                        principalColumn: "DatabaseConnectionID",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Queries_AspNetUsers_LastEditedById",
                        column: x => x.LastEditedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserDatabaseConnections",
                columns: table => new
                {
                    UserDatabaseConnectionID = table.Column<int>(nullable: false)
                        .Annotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    ApplicationUserID = table.Column<string>(nullable: true),
                    CreatedById = table.Column<string>(nullable: true),
                    CreatedOn = table.Column<DateTime>(nullable: false),
                    DatabaseConnectionID = table.Column<int>(nullable: false),
                    InviteEmail = table.Column<string>(nullable: true),
                    Type = table.Column<int>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDatabaseConnections", x => x.UserDatabaseConnectionID);
                    table.ForeignKey(
                        name: "FK_UserDatabaseConnections_AspNetUsers_ApplicationUserID",
                        column: x => x.ApplicationUserID,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserDatabaseConnections_AspNetUsers_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserDatabaseConnections_DatabaseConnections_DatabaseConnectionID",
                        column: x => x.DatabaseConnectionID,
                        principalTable: "DatabaseConnections",
                        principalColumn: "DatabaseConnectionID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScheduledReports",
                columns: table => new
                {
                    ScheduleID = table.Column<int>(nullable: false),
                    DayOfMonth = table.Column<int>(nullable: true),
                    DayOfWeek = table.Column<int>(nullable: true),
                    FrequencyScheduled = table.Column<int>(nullable: false),
                    Recipients = table.Column<string>(nullable: true),
                    Time = table.Column<TimeSpan>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScheduledReports", x => x.ScheduleID);
                    table.ForeignKey(
                        name: "FK_ScheduledReports_Queries_ScheduleID",
                        column: x => x.ScheduleID,
                        principalTable: "Queries",
                        principalColumn: "QueryID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "AspNetRoles",
                column: "NormalizedName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetRoleClaims_RoleId",
                table: "AspNetRoleClaims",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "AspNetUsers",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "AspNetUsers",
                column: "NormalizedUserName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_OrganisationId",
                table: "AspNetUsers",
                column: "OrganisationId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserClaims_UserId",
                table: "AspNetUserClaims",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserLogins_UserId",
                table: "AspNetUserLogins",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUserRoles_RoleId",
                table: "AspNetUserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_DatabaseConnections_OrganisationId",
                table: "DatabaseConnections",
                column: "OrganisationId");

            migrationBuilder.CreateIndex(
                name: "IX_DatabaseConnections_SshKeyFileID",
                table: "DatabaseConnections",
                column: "SshKeyFileID");

            migrationBuilder.CreateIndex(
                name: "IX_OrganisationInvites_CreatedById",
                table: "OrganisationInvites",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Queries_CreatedById",
                table: "Queries",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Queries_DatabaseConnectionID",
                table: "Queries",
                column: "DatabaseConnectionID");

            migrationBuilder.CreateIndex(
                name: "IX_Queries_LastEditedById",
                table: "Queries",
                column: "LastEditedById");

            migrationBuilder.CreateIndex(
                name: "IX_SshKeyFiles_CreatedById",
                table: "SshKeyFiles",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_UserDatabaseConnections_ApplicationUserID",
                table: "UserDatabaseConnections",
                column: "ApplicationUserID");

            migrationBuilder.CreateIndex(
                name: "IX_UserDatabaseConnections_CreatedById",
                table: "UserDatabaseConnections",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_UserDatabaseConnections_DatabaseConnectionID",
                table: "UserDatabaseConnections",
                column: "DatabaseConnectionID");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AspNetRoleClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserClaims");

            migrationBuilder.DropTable(
                name: "AspNetUserLogins");

            migrationBuilder.DropTable(
                name: "AspNetUserRoles");

            migrationBuilder.DropTable(
                name: "AspNetUserTokens");

            migrationBuilder.DropTable(
                name: "OrganisationInvites");

            migrationBuilder.DropTable(
                name: "ScheduledReports");

            migrationBuilder.DropTable(
                name: "UserDatabaseConnections");

            migrationBuilder.DropTable(
                name: "AspNetRoles");

            migrationBuilder.DropTable(
                name: "Queries");

            migrationBuilder.DropTable(
                name: "DatabaseConnections");

            migrationBuilder.DropTable(
                name: "SshKeyFiles");

            migrationBuilder.DropTable(
                name: "AspNetUsers");

            migrationBuilder.DropTable(
                name: "Organisations");
        }
    }
}
