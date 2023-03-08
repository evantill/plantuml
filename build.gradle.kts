//    permits to start the build setting the javac release parameter, no parameter means build for java8:
// gradle clean build -x javaDoc -PjavacRelease=8
// gradle clean build -x javaDoc -PjavacRelease=17
//    also supported is to build first, with java17, then switch the java version, and run the test with java8:
// gradle clean build -x javaDoc -x test
// gradle test
val javacRelease = (project.findProperty("javacRelease") ?: "8") as String

plugins {
	java
	`maven-publish`
	signing
}

group = "com.github.evantill.plantuml"
description = "PlantUML"

java {
	withSourcesJar()
	withJavadocJar()
	registerFeature("pdf") {
		usingSourceSet(sourceSets["main"])
	}
}

dependencies {
	compileOnly("org.apache.ant:ant:1.10.13")
	testImplementation("org.assertj:assertj-core:3.24.2")
	testImplementation("org.junit.jupiter:junit-jupiter:5.9.2")
	testImplementation("org.scilab.forge:jlatexmath:1.0.7")
	"pdfRuntimeOnly"("org.apache.xmlgraphics:fop:2.8")
	"pdfRuntimeOnly"("org.apache.xmlgraphics:batik-all:1.16")
}

repositories {
	mavenLocal()
	mavenCentral()
}

sourceSets {
	main {
		java {
			srcDirs("src")
		}
		resources {
			srcDirs("src")
			include("**/graphviz.dat")
			include("**/*.png")
			include("**/*.svg")
			include("**/*.txt")
		}
	}
	test {
		java {
			srcDirs("test")
		}
		resources {
			srcDirs(".")
			include("skin/**/*.skin")
			include("themes/**/*.puml")
		}
	}
}

tasks.compileJava {
	if (JavaVersion.current().isJava8) {
		java.targetCompatibility = JavaVersion.VERSION_1_8
	} else {
		options.release.set(Integer.parseInt(javacRelease))
	}
}

tasks.withType<Jar>().configureEach {
	manifest {
		attributes["Main-Class"] = "net.sourceforge.plantuml.Run"
		attributes["Implementation-Version"] = archiveVersion
		attributes["Build-Jdk-Spec"] = System.getProperty("java.specification.version")
		from("manifest.txt")
	}
	from("skin") { into("skin") }
	from("stdlib") { into("stdlib") }
	from("svg") { into("svg") }
	from("themes") { into("themes") }
	// source sets for java and resources are on "src", only put once into the jar
	duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

publishing {
	publications.create<MavenPublication>("maven") {
		from(components["java"])
		pom {
			groupId = project.group as String
			artifactId = project.name
			version = project.version as String
			url.set("https://plantuml.com/")
			licenses {
				license {
					name.set("The GNU General Public License")
					url.set("http://www.gnu.org/licenses/gpl.txt")
				}
			}
			developers {
				developer {
					id.set("arnaud.roques")
					name.set("Arnaud Roques")
					email.set("plantuml@gmail.com")
				}
			}
			scm {
				connection.set("scm:git:git://github.com:evantill/plantuml.git")
				developerConnection.set("scm:git:ssh://git@github.com:evantill/plantuml.git")
				url.set("https://github.com/evantill/plantuml")
			}
		}
	}
	repositories {
		maven {
			name = "OSSRH"
			val releasesRepoUrl: String by project
			val snapshotsRepoUrl: String by project
			url = uri(if (version.toString().endsWith("SNAPSHOT")) snapshotsRepoUrl else releasesRepoUrl)
			credentials {
				username = System.getenv("OSSRH_USERNAME")
				password = System.getenv("OSSRH_PASSWORD")
			}
		}
	}
}

tasks.withType<JavaCompile>().configureEach {
	options.encoding = "UTF-8"
}

tasks.withType<Javadoc>().configureEach {
	options {
		this as StandardJavadocDocletOptions
		addBooleanOption("Xdoclint:none", true)
		addStringOption("Xmaxwarns", "1")
		encoding = "UTF-8"
		isUse = true
	}
}

tasks.test {
	useJUnitPlatform()
	testLogging.showStandardStreams = true
}

val pdfJar by tasks.registering(Jar::class) {
	group = "build" // OR for example, "build"
	description = "Assembles a jar containing dependencies to create PDFs."
	manifest.attributes["Main-Class"] = "net.sourceforge.plantuml.Run"
	duplicatesStrategy = DuplicatesStrategy.EXCLUDE
	val dependencies = configurations.runtimeClasspath.get().map(::zipTree)
	from(dependencies)
	with(tasks.jar.get())
	archiveAppendix.set("pdf")
}

signing {
	val useGpgCmd = hasProperty("signing.gnupg.keyName") && hasProperty("signing.gnupg.passphrase")
	val useInMemoryPgpKey = hasProperty("signingKey") && hasProperty("signingPassword")
	if (useGpgCmd) {
		useGpgCmd()
	} else if (useInMemoryPgpKey) {
		val signingKey: String? by project
		val signingPassword: String? by project
		useInMemoryPgpKeys(signingKey, signingPassword)
	}
	if (useGpgCmd || useInMemoryPgpKey) {
		sign(publishing.publications["maven"])
		sign(closureOf<SignOperation> { sign(pdfJar.get()) })
	}
}
