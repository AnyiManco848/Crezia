-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: crezia
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categoria_egresos`
--

DROP TABLE IF EXISTS `categoria_egresos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria_egresos` (
  `Id_Categoria_Egreso` int NOT NULL AUTO_INCREMENT,
  `Id_Usuario` int NOT NULL,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Id_Categoria_Egreso`),
  KEY `Id_Usuario` (`Id_Usuario`),
  CONSTRAINT `categoria_egresos_ibfk_1` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuarios` (`Id_Usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categoria_egresos`
--

LOCK TABLES `categoria_egresos` WRITE;
/*!40000 ALTER TABLE `categoria_egresos` DISABLE KEYS */;
INSERT INTO `categoria_egresos` VALUES (1,1,'Transporte','Gastos en bus, metro o taxi'),(2,2,'Comida','Almuerzos y snacks'),(3,3,'Educación','Materiales y fotocopias'),(4,4,'Ropa','Compra de vestuario'),(5,5,'Entretenimiento','Cine, juegos, salidas');
/*!40000 ALTER TABLE `categoria_egresos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categoria_ingreso`
--

DROP TABLE IF EXISTS `categoria_ingreso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria_ingreso` (
  `Id_Categoria_Ingreso` int NOT NULL AUTO_INCREMENT,
  `Id_Usuario` int NOT NULL,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Id_Categoria_Ingreso`),
  KEY `Id_Usuario` (`Id_Usuario`),
  CONSTRAINT `categoria_ingreso_ibfk_1` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuarios` (`Id_Usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categoria_ingreso`
--

LOCK TABLES `categoria_ingreso` WRITE;
/*!40000 ALTER TABLE `categoria_ingreso` DISABLE KEYS */;
INSERT INTO `categoria_ingreso` VALUES (1,1,'Beca','Ingreso por apoyo académico'),(2,2,'Trabajo','Ingreso por empleo de medio tiempo'),(3,3,'Mesada','Dinero recibido de padres'),(4,4,'Freelance','Trabajos independientes'),(5,5,'Venta','Ingresos por ventas personales');
/*!40000 ALTER TABLE `categoria_ingreso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categoria_meta`
--

DROP TABLE IF EXISTS `categoria_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categoria_meta` (
  `Id_Categoria_Meta` int NOT NULL AUTO_INCREMENT,
  `Id_Usuario` int NOT NULL,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Id_Categoria_Meta`),
  KEY `Id_Usuario` (`Id_Usuario`),
  CONSTRAINT `categoria_meta_ibfk_1` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuarios` (`Id_Usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categoria_meta`
--

LOCK TABLES `categoria_meta` WRITE;
/*!40000 ALTER TABLE `categoria_meta` DISABLE KEYS */;
INSERT INTO `categoria_meta` VALUES (1,1,'Ahorro Viaje','Viaje de vacaciones'),(2,2,'Compra Laptop','Ahorrar para computador'),(3,3,'Curso Extra','Pago curso adicional'),(4,4,'Fondo Emergencia','Ahorro imprevistos'),(5,5,'Celular Nuevo','Comprar smartphone');
/*!40000 ALTER TABLE `categoria_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `egreso`
--

DROP TABLE IF EXISTS `egreso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `egreso` (
  `Id_Movimiento` int NOT NULL,
  `Id_Categoria_Egreso` int NOT NULL,
  PRIMARY KEY (`Id_Movimiento`),
  KEY `Id_Categoria_Egreso` (`Id_Categoria_Egreso`),
  CONSTRAINT `egreso_ibfk_1` FOREIGN KEY (`Id_Movimiento`) REFERENCES `movimientos` (`Id_Movimiento`),
  CONSTRAINT `egreso_ibfk_2` FOREIGN KEY (`Id_Categoria_Egreso`) REFERENCES `categoria_egresos` (`Id_Categoria_Egreso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `egreso`
--

LOCK TABLES `egreso` WRITE;
/*!40000 ALTER TABLE `egreso` DISABLE KEYS */;
INSERT INTO `egreso` VALUES (1,1),(4,2);
/*!40000 ALTER TABLE `egreso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingreso`
--

DROP TABLE IF EXISTS `ingreso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingreso` (
  `Id_Movimiento` int NOT NULL,
  `Id_Categoria_Ingreso` int NOT NULL,
  PRIMARY KEY (`Id_Movimiento`),
  KEY `Id_Categoria_Ingreso` (`Id_Categoria_Ingreso`),
  CONSTRAINT `ingreso_ibfk_1` FOREIGN KEY (`Id_Movimiento`) REFERENCES `movimientos` (`Id_Movimiento`),
  CONSTRAINT `ingreso_ibfk_2` FOREIGN KEY (`Id_Categoria_Ingreso`) REFERENCES `categoria_ingreso` (`Id_Categoria_Ingreso`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingreso`
--

LOCK TABLES `ingreso` WRITE;
/*!40000 ALTER TABLE `ingreso` DISABLE KEYS */;
INSERT INTO `ingreso` VALUES (2,2),(5,3);
/*!40000 ALTER TABLE `ingreso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meta`
--

DROP TABLE IF EXISTS `meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meta` (
  `Id_Movimiento` int NOT NULL,
  `Id_Categoria_Meta` int NOT NULL,
  `Nombre` varchar(50) NOT NULL,
  `Tipo_Meta` varchar(30) DEFAULT NULL,
  `Fecha_Inicio` date DEFAULT NULL,
  `Fecha_Final` date DEFAULT NULL,
  PRIMARY KEY (`Id_Movimiento`),
  KEY `Id_Categoria_Meta` (`Id_Categoria_Meta`),
  CONSTRAINT `meta_ibfk_1` FOREIGN KEY (`Id_Movimiento`) REFERENCES `movimientos` (`Id_Movimiento`),
  CONSTRAINT `meta_ibfk_2` FOREIGN KEY (`Id_Categoria_Meta`) REFERENCES `categoria_meta` (`Id_Categoria_Meta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meta`
--

LOCK TABLES `meta` WRITE;
/*!40000 ALTER TABLE `meta` DISABLE KEYS */;
INSERT INTO `meta` VALUES (3,1,'Viaje a Cartagena','Ahorro','2025-09-01','2025-12-31');
/*!40000 ALTER TABLE `meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `movimientos`
--

DROP TABLE IF EXISTS `movimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos` (
  `Id_Movimiento` int NOT NULL AUTO_INCREMENT,
  `Id_Usuario` int NOT NULL,
  `Monto` decimal(10,2) NOT NULL,
  `Fecha` date NOT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`Id_Movimiento`),
  KEY `Id_Usuario` (`Id_Usuario`),
  CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`Id_Usuario`) REFERENCES `usuarios` (`Id_Usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `movimientos`
--

LOCK TABLES `movimientos` WRITE;
/*!40000 ALTER TABLE `movimientos` DISABLE KEYS */;
INSERT INTO `movimientos` VALUES (1,1,3500.00,'2025-09-01','Pasaje de bus'),(2,2,800000.00,'2025-09-02','Pago quincena medio tiempo'),(3,1,200000.00,'2025-09-03','Ahorro mensual para viaje'),(4,3,12000.00,'2025-09-03','Almuerzo en la universidad'),(5,4,300000.00,'2025-09-04','Mesada mensual de los padres');
/*!40000 ALTER TABLE `movimientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `Id_Usuario` int NOT NULL AUTO_INCREMENT,
  `DNI` varchar(15) NOT NULL,
  `Nombre` varchar(20) NOT NULL,
  `Apellidos` varchar(30) NOT NULL,
  `Telefono` varchar(12) DEFAULT NULL,
  `Correo_Electronico` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`Id_Usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'1001234567','Juan','Pérez Gómez','3001234567','juanperez@mail.com'),(2,'1009876543','María','Rodríguez López','3109876543','maria.rod@mail.com'),(3,'1014567890','Carlos','García Torres','3204567890','carlosgt@mail.com'),(4,'1022345678','Laura','Martínez Ruiz','3012345678','lauramr@mail.com'),(5,'1033456789','Andrés','Ramírez Silva','3153456789','andresrs@mail.com');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-29 16:58:10
