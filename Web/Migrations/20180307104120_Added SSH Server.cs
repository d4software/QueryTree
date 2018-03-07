using Microsoft.EntityFrameworkCore.Migrations;
using System;
using System.Collections.Generic;

namespace Web.Migrations
{
    public partial class AddedSSHServer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.EndsWith("Sqlite"))
            {
                migrationBuilder.Sql("ALTER TABLE DatabaseConnections ADD COLUMN SshServer TEXT;");
            }
            else 
            {
                migrationBuilder.AddColumn<string>(
                    table: "DatabaseConnections",
                    name: "SshServer",
                    nullable: true
                );
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.EndsWith("Sqlite"))
            {
                // Rename old table, create newer version, copy data and drop old table
                migrationBuilder.Sql(@"

PRAGMA foreign_keys=off;
 
ALTER TABLE DatabaseConnections RENAME TO temp_DatabaseConnections;
 
CREATE TABLE DatabaseConnections
(
  DatabaseConnectionID INTEGER NOT NULL
    CONSTRAINT PK_DatabaseConnections
    PRIMARY KEY
  AUTOINCREMENT,
  CreatedOn            TEXT    NOT NULL,
  DatabaseName         TEXT    NOT NULL,
  Description          TEXT,
  Name                 TEXT    NOT NULL,
  OrganisationId       INTEGER NOT NULL
    CONSTRAINT FK_DatabaseConnections_Organisations_OrganisationId
    REFERENCES Organisations
      ON DELETE CASCADE,
  Port                 INTEGER NOT NULL,
  Server               TEXT    NOT NULL,
  SshKeyFileID         INTEGER
    CONSTRAINT FK_DatabaseConnections_SshKeyFiles_SshKeyFileID
    REFERENCES SshKeyFiles
      ON DELETE RESTRICT,
  SshPort              INTEGER,
  SshUsername          TEXT,
  Type                 INTEGER NOT NULL,
  UseSsh               INTEGER NOT NULL,
  UseSshKey            INTEGER NOT NULL,
  Username             TEXT    NOT NULL
);
 
INSERT INTO DatabaseConnections (
    DatabaseConnectionID,
    CreatedOn,
    DatabaseName,
    Description,
    Name,
    OrganisationId,
    Port,
    Server,
    SshKeyFileID,
    SshPort,
    SshUsername,
    Type,
    UseSsh,
    UseSshKey,
    Username
  )
  SELECT
    DatabaseConnectionID,
    CreatedOn,
    DatabaseName,
    Description,
    Name,
    OrganisationId,
    Port,
    Server,
    SshKeyFileID,
    SshPort,
    SshUsername,
    Type,
    UseSsh,
    UseSshKey,
    Username
  FROM temp_DatabaseConnections;
 
DROP TABLE temp_DatabaseConnections;
 
PRAGMA foreign_keys=on;
                
                ");
            }
            else 
            {
                migrationBuilder.DropColumn(
                    name: "SshServer",
                    table: "DatabaseConnections");
            }
        }
    }
}
