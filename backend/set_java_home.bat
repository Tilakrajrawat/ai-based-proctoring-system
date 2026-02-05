@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-24
set PATH=%JAVA_HOME%\bin;%PATH%
echo JAVA_HOME set to: %JAVA_HOME%
java -version
./mvnw.cmd spring-boot:run
