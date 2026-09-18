# Stage 1: Build Spring Boot Backend
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build-backend
WORKDIR /app/backend
COPY spring-backend/pom.xml ./
ARG CACHEBURST=1
RUN echo "Building version $CACHEBURST"
COPY spring-backend/src ./src
RUN rm -rf target && mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build-backend /app/backend/target/app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Xmx384m", "-Xms128m", "-jar", "app.jar"]
