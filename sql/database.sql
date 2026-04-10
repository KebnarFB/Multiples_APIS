create database if not exists Weather_APP;
Use Weather_APP;

Create table Users (
id int auto_increment primary key,
nombres varchar(100) not null,
username varchar(30) not null unique,
email varchar(40) not null unique,
password varchar(100) not null);