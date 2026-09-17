using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BPOTime.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGpsGeofencing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Projects",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AllowedRadiusMeters",
                table: "Projects",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                table: "Projects",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                table: "Projects",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequireGps",
                table: "Projects",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CheckInDevice",
                table: "Attendances",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CheckInLatitude",
                table: "Attendances",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "CheckInLongitude",
                table: "Attendances",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CheckedInBy",
                table: "Attendances",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "DistanceToProjectMeters",
                table: "Attendances",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGpsVerified",
                table: "Attendances",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "AllowedRadiusMeters",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "RequireGps",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "CheckInDevice",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "CheckInLatitude",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "CheckInLongitude",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "CheckedInBy",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "DistanceToProjectMeters",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "IsGpsVerified",
                table: "Attendances");
        }
    }
}
