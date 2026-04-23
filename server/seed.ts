import { db } from "./db";
import { users, classes, bookings, reviews, notifications, safeguardingReports, lessons, quizzes, assignments, quizResults, assignmentSubmissions, courseProgress, notes, discussions, discussionReplies, certificates, favorites, contactSubmissions, peerHelpers, peerHelpRequests, peerSessions, messages, loginHistory, userSettings, classWaitlist } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    // Incremental seeding: backfill quizzes/lessons if missing from a previous partial seed
    const existingQuizzes = await db.select().from(quizzes).limit(1);
    if (existingQuizzes.length === 0) {
      await backfillQuizzesAndLessons();
    }
    return;
  }

  console.log("Seeding database...");

  const hashedPw = await bcrypt.hash("password123", 10);

  const [coordinator] = await db.insert(users).values({
    name: "Sarah Mitchell",
    email: "sarah@tutorbridge.org",
    password: hashedPw,
    role: "coordinator",
    isVerified: true,
    bio: "Orphanage education coordinator with 8 years of experience in child development and learning programs.",
    organization: "TutorBridge Foundation",
    skillsTaught: null,
    skillsLearning: null,
  }).returning();

  const [tutor1] = await db.insert(users).values({
    name: "James Owusu",
    email: "james@example.com",
    password: hashedPw,
    role: "tutor",
    isVerified: true,
    bio: "Mathematics and Computer Science teacher with a passion for making complex concepts accessible. I believe every child can excel with the right guidance and patience.",
    skillsTaught: ["Mathematics", "Algebra", "Geometry", "Statistics", "Python", "Web Development"],
    skillsLearning: null,
    rating: "4.80",
    totalReviews: 24,
  }).returning();

  const [tutor2] = await db.insert(users).values({
    name: "Amara Diallo",
    email: "amara@example.com",
    password: hashedPw,
    role: "tutor",
    isVerified: true,
    bio: "Science enthusiast and educator with 5 years of teaching experience. I love making physics and chemistry come alive through real-world experiments and engaging demonstrations.",
    skillsTaught: ["Science", "Physics", "Chemistry", "Biology", "Environmental Science"],
    skillsLearning: null,
    rating: "4.60",
    totalReviews: 18,
  }).returning();

  const [tutor3] = await db.insert(users).values({
    name: "Priya Sharma",
    email: "priya@example.com",
    password: hashedPw,
    role: "tutor",
    isVerified: true,
    bio: "English literature graduate and language specialist helping students improve their reading, writing, and communication skills through engaging stories and creative activities.",
    skillsTaught: ["English", "Reading", "Writing", "Communication", "Spanish", "French"],
    skillsLearning: null,
    rating: "4.90",
    totalReviews: 32,
  }).returning();

  const [student1] = await db.insert(users).values({
    name: "Kofi Mensah",
    email: "kofi@example.com",
    password: hashedPw,
    role: "student",
    isVerified: true,
    bio: "I love learning new things, especially math and science. I dream of becoming a software engineer one day.",
    orphanage: "Hope Children's Home",
    skillsLearning: ["Mathematics", "Science", "Computer Skills", "Python"],
    skillsTaught: null,
  }).returning();

  const [student2] = await db.insert(users).values({
    name: "Nia Okafor",
    email: "nia@example.com",
    password: hashedPw,
    role: "student",
    isVerified: true,
    bio: "Aspiring artist who also wants to learn coding. I enjoy creative writing and photography.",
    orphanage: "Sunshine Orphanage",
    skillsLearning: ["Art & Creativity", "Computer Skills", "English", "Photography"],
    skillsTaught: null,
  }).returning();

  // #58: additional students for pagination/analytics testing
  const [student3] = await db.insert(users).values({
    name: "Emeka Nwosu",
    email: "emeka@example.com",
    password: hashedPw,
    role: "student",
    isVerified: true,
    bio: "Science enthusiast from Lagos. I want to study medicine one day and need help with biology and chemistry.",
    orphanage: "Hope Children's Home",
    skillsLearning: ["Science", "Biology", "Chemistry", "Mathematics"],
    skillsTaught: null,
  }).returning();

  const [student4] = await db.insert(users).values({
    name: "Amina Bello",
    email: "amina@example.com",
    password: hashedPw,
    role: "student",
    isVerified: true,
    bio: "I love languages and want to become a translator. Currently improving my English and French skills.",
    orphanage: "Sunshine Orphanage",
    skillsLearning: ["Languages", "English", "French", "Writing"],
    skillsTaught: null,
  }).returning();

  const [student5] = await db.insert(users).values({
    name: "Taiwo Adeyemi",
    email: "taiwo@example.com",
    password: hashedPw,
    role: "student",
    isVerified: true,
    bio: "Passionate about tech and entrepreneurship. Learning programming and business skills to build my own startup someday.",
    orphanage: "Bright Future Home",
    skillsLearning: ["Programming", "Career & Business", "Life Skills", "Mathematics"],
    skillsTaught: null,
  }).returning();

  // #58: additional tutors for diversity in analytics and class listings
  const [tutor4] = await db.insert(users).values({
    name: "David Chen",
    email: "david@example.com",
    password: hashedPw,
    role: "tutor",
    isVerified: true,
    bio: "Software engineer with 7 years of industry experience. Passionate about teaching algorithms, data structures, and web development to aspiring developers.",
    skillsTaught: ["Programming", "Algorithms", "Data Structures", "JavaScript", "TypeScript"],
    skillsLearning: null,
    rating: "4.70",
    totalReviews: 15,
  }).returning();

  const [tutor5] = await db.insert(users).values({
    name: "Fatima Al-Rashidi",
    email: "fatima@example.com",
    password: hashedPw,
    role: "tutor",
    isVerified: true,
    bio: "Former university professor specialising in mathematics and physics. I believe every student can master hard sciences with the right approach.",
    skillsTaught: ["Mathematics", "Physics", "Calculus", "Statistics", "Problem Solving"],
    skillsLearning: null,
    rating: "4.85",
    totalReviews: 22,
  }).returning();

  const tutors = [tutor1, tutor2, tutor3];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 14);
  const futureDate3 = new Date();
  futureDate3.setDate(futureDate3.getDate() + 21);
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1);

  const coursesData = [
    { title: "Python Programming for Beginners", description: "Master the fundamentals of Python programming from scratch. This comprehensive course covers variables, data types, control structures, functions, and object-oriented programming. Through hands-on projects and real-world examples, you'll build a solid foundation in one of the world's most popular programming languages. Perfect for absolute beginners who want to start their coding journey.", category: "Programming & Tech", skillLevel: "beginner" as const, duration: 120, maxStudents: 50, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800", totalLectures: 12, enrolledCount: 34, tutorIdx: 0, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    { title: "Web Development with React & Node.js", description: "Learn full-stack web development using React for the frontend and Node.js for the backend. This course covers component-based architecture, state management, RESTful APIs, database integration, and deployment. Build real-world projects including a social media app and an e-commerce platform. Gain the skills needed to become a professional web developer.", category: "Programming & Tech", skillLevel: "intermediate" as const, duration: 180, maxStudents: 40, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800", totalLectures: 15, enrolledCount: 28, tutorIdx: 0, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
    { title: "Introduction to Artificial Intelligence", description: "Explore the fascinating world of Artificial Intelligence and Machine Learning. Understand how AI systems work, from basic neural networks to advanced deep learning concepts. Learn about natural language processing, computer vision, and ethical considerations in AI development. This course provides a solid theoretical foundation with practical demonstrations.", category: "Programming & Tech", skillLevel: "intermediate" as const, duration: 90, maxStudents: 35, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800", totalLectures: 10, enrolledCount: 19, tutorIdx: 0, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
    { title: "Data Science Fundamentals", description: "Dive into the world of data science and analytics. Learn to collect, clean, analyze, and visualize data using Python libraries like Pandas, NumPy, and Matplotlib. Understand statistical concepts, hypothesis testing, and regression analysis. Complete hands-on projects with real datasets to build your data science portfolio.", category: "Programming & Tech", skillLevel: "intermediate" as const, duration: 150, maxStudents: 30, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", totalLectures: 14, enrolledCount: 16, tutorIdx: 0 },
    { title: "Cybersecurity Basics", description: "Learn the fundamentals of cybersecurity and protect yourself online. This course covers network security, cryptography, malware analysis, social engineering, and ethical hacking basics. Understand common vulnerabilities and how to defend against cyber threats. Essential knowledge for anyone interested in information security careers.", category: "Programming & Tech", skillLevel: "beginner" as const, duration: 75, maxStudents: 45, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800", totalLectures: 8, enrolledCount: 24, tutorIdx: 0 },
    { title: "Mobile App Development with Flutter", description: "Create beautiful cross-platform mobile applications using Flutter and Dart. Learn widget-based UI development, state management, navigation, API integration, and app publishing. Build three complete apps throughout the course including a weather app, chat application, and fitness tracker.", category: "Programming & Tech", skillLevel: "intermediate" as const, duration: 160, maxStudents: 25, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800", totalLectures: 16, enrolledCount: 13, tutorIdx: 0 },
    { title: "Database Design with SQL", description: "Master relational database design and SQL querying. Learn about table relationships, normalization, indexing, and performance optimization. Practice writing complex queries including joins, subqueries, and aggregations. Work with PostgreSQL to build real database schemas for web applications.", category: "Programming & Tech", skillLevel: "beginner" as const, duration: 60, maxStudents: 40, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800", totalLectures: 8, enrolledCount: 26, tutorIdx: 0 },
    { title: "Cloud Computing with AWS", description: "Get started with cloud computing using Amazon Web Services. Learn about EC2, S3, Lambda, DynamoDB, and other core services. Understand cloud architecture patterns, serverless computing, and DevOps practices. Prepare for the AWS Cloud Practitioner certification with hands-on labs.", category: "Programming & Tech", skillLevel: "advanced" as const, duration: 120, maxStudents: 20, courseType: "upcoming" as const, thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800", totalLectures: 10, enrolledCount: 9, tutorIdx: 0 },
    { title: "Game Development Fundamentals", description: "Learn the basics of game development and create your own games. Cover game design principles, physics engines, sprite animation, collision detection, and user input handling. Build multiple 2D games using popular game frameworks. Perfect for creative individuals who want to combine programming with artistic expression.", category: "Programming & Tech", skillLevel: "beginner" as const, duration: 90, maxStudents: 30, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800", totalLectures: 10, enrolledCount: 15, tutorIdx: 0 },
    { title: "Introduction to Machine Learning", description: "Understand the core concepts of machine learning and build predictive models. Learn supervised and unsupervised learning algorithms, feature engineering, model evaluation, and deployment. Implement algorithms from scratch and using scikit-learn. Work on practical projects including sentiment analysis and image classification.", category: "Programming & Tech", skillLevel: "advanced" as const, duration: 140, maxStudents: 25, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800", totalLectures: 12, enrolledCount: 12, tutorIdx: 0 },

    { title: "Algebra Made Easy", description: "Conquer algebra with this beginner-friendly course. Master variables, expressions, equations, inequalities, and graphing. Learn problem-solving strategies that make algebra intuitive and even enjoyable. Each lesson includes worked examples, practice problems, and real-world applications that show why algebra matters in everyday life.", category: "Mathematics", skillLevel: "beginner" as const, duration: 60, maxStudents: 20, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800", totalLectures: 8, enrolledCount: 11, tutorIdx: 0, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" },
    { title: "Calculus Fundamentals", description: "Build a strong foundation in calculus covering limits, derivatives, and integrals. Understand the geometric meaning behind mathematical concepts through visualization and intuitive explanations. Apply calculus to solve optimization problems, calculate areas, and model real-world phenomena from physics and engineering.", category: "Mathematics", skillLevel: "advanced" as const, duration: 90, maxStudents: 15, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800", totalLectures: 10, enrolledCount: 6, tutorIdx: 0 },
    { title: "Statistics for Beginners", description: "Learn the essential concepts of statistics that are used everywhere from science to business. Cover descriptive statistics, probability theory, sampling methods, hypothesis testing, and regression analysis. Use real datasets to practice statistical analysis and learn to interpret results with confidence.", category: "Mathematics", skillLevel: "beginner" as const, duration: 75, maxStudents: 30, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800", totalLectures: 8, enrolledCount: 14, tutorIdx: 0 },
    { title: "Geometry & Trigonometry", description: "Explore the beautiful world of shapes, angles, and spatial reasoning. Learn about triangles, circles, polygons, transformations, and trigonometric functions. Discover geometric proofs, coordinate geometry, and applications in architecture and design. Interactive visualizations make complex concepts easy to understand.", category: "Mathematics", skillLevel: "intermediate" as const, duration: 65, maxStudents: 25, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=800", totalLectures: 8, enrolledCount: 10, tutorIdx: 0 },
    { title: "Mathematical Problem Solving", description: "Develop critical mathematical thinking and problem-solving skills. Learn strategies for approaching unfamiliar problems, breaking them into manageable parts, and finding creative solutions. Practice with competition-style problems and brain teasers that strengthen your mathematical intuition and logical reasoning abilities.", category: "Mathematics", skillLevel: "intermediate" as const, duration: 50, maxStudents: 20, courseType: "upcoming" as const, thumbnailUrl: "https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=800", totalLectures: 6, enrolledCount: 7, tutorIdx: 0 },

    { title: "Emotional Intelligence Mastery", description: "Develop the emotional intelligence skills that are essential for personal and professional success. Learn to recognize and manage your emotions, empathize with others, build stronger relationships, and handle conflicts constructively. Includes practical exercises, self-assessment tools, and strategies for emotional resilience.", category: "Life Skills", skillLevel: "beginner" as const, duration: 45, maxStudents: 30, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800", totalLectures: 8, enrolledCount: 17, tutorIdx: 2, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" },
    { title: "Effective Communication Skills", description: "Master the art of communication in both personal and professional settings. Learn active listening techniques, assertive speaking, non-verbal communication, persuasion, and conflict resolution. Practice through role-playing exercises, group discussions, and presentation skills workshops that build lasting confidence.", category: "Life Skills", skillLevel: "beginner" as const, duration: 40, maxStudents: 25, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800", totalLectures: 6, enrolledCount: 11, tutorIdx: 2 },
    { title: "Critical Thinking & Problem Solving", description: "Sharpen your analytical thinking abilities with structured approaches to problem-solving. Learn to evaluate arguments, identify logical fallacies, make better decisions, and think creatively under pressure. Apply critical thinking frameworks to real-world scenarios from science, business, and everyday life.", category: "Life Skills", skillLevel: "intermediate" as const, duration: 55, maxStudents: 20, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800", totalLectures: 7, enrolledCount: 8, tutorIdx: 2 },
    { title: "Time Management Excellence", description: "Take control of your time and dramatically increase your productivity. Learn proven time management techniques including the Pomodoro method, Eisenhower Matrix, time blocking, and goal setting. Create personalized productivity systems that help you achieve more while maintaining work-life balance.", category: "Life Skills", skillLevel: "beginner" as const, duration: 35, maxStudents: 40, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800", totalLectures: 5, enrolledCount: 22, tutorIdx: 2 },
    { title: "Leadership Development", description: "Develop essential leadership skills for the modern world. Learn about different leadership styles, team motivation, delegation, strategic thinking, and ethical decision-making. Study real-world case studies of successful leaders and develop your own leadership philosophy through reflective exercises.", category: "Life Skills", skillLevel: "intermediate" as const, duration: 60, maxStudents: 20, courseType: "upcoming" as const, thumbnailUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800", totalLectures: 8, enrolledCount: 9, tutorIdx: 2 },
    { title: "Stress Management & Mindfulness", description: "Learn evidence-based techniques for managing stress and cultivating mindfulness. Practice meditation, deep breathing, progressive muscle relaxation, and mindful awareness exercises. Understand the science behind stress and how mindfulness can improve mental health, focus, and overall well-being.", category: "Life Skills", skillLevel: "beginner" as const, duration: 30, maxStudents: 50, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800", totalLectures: 6, enrolledCount: 31, tutorIdx: 2 },
    { title: "Financial Literacy for Teens", description: "Build essential financial skills for life. Learn about budgeting, saving, investing basics, compound interest, credit scores, and avoiding debt traps. Understand how money works and develop habits that will set you up for financial success. Includes interactive simulations and real-world financial planning exercises.", category: "Life Skills", skillLevel: "beginner" as const, duration: 50, maxStudents: 35, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800", totalLectures: 7, enrolledCount: 20, tutorIdx: 2 },
    { title: "Public Speaking Confidence", description: "Overcome your fear of public speaking and become a confident presenter. Learn speech structure, storytelling techniques, body language, voice projection, and audience engagement strategies. Practice with increasingly challenging speaking assignments in a supportive environment that builds real confidence.", category: "Life Skills", skillLevel: "beginner" as const, duration: 45, maxStudents: 2, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800", totalLectures: 6, enrolledCount: 2, tutorIdx: 2 },

    { title: "English Grammar & Writing", description: "Strengthen your English grammar and writing skills for academic and professional success. Cover sentence structure, punctuation, paragraph organization, essay writing, and editing techniques. Learn to write clearly and persuasively across different formats including emails, reports, and creative writing.", category: "Languages", skillLevel: "beginner" as const, duration: 60, maxStudents: 25, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800", totalLectures: 10, enrolledCount: 14, tutorIdx: 2 },
    { title: "Spanish for Beginners", description: "Start your Spanish language journey with this comprehensive beginner course. Learn essential vocabulary, grammar rules, pronunciation, and conversational phrases. Practice through interactive dialogues, listening exercises, and cultural immersion activities. By the end, you'll be able to hold basic conversations in Spanish.", category: "Languages", skillLevel: "beginner" as const, duration: 75, maxStudents: 20, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1543109740-4bdb38fda756?w=800", totalLectures: 12, enrolledCount: 9, tutorIdx: 2 },
    { title: "French Conversation Skills", description: "Improve your French speaking and listening skills through guided conversation practice. Focus on everyday situations including greetings, shopping, dining, travel, and professional interactions. Learn idiomatic expressions, pronunciation tips, and cultural context that will help you communicate naturally in French.", category: "Languages", skillLevel: "intermediate" as const, duration: 50, maxStudents: 15, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=800", totalLectures: 8, enrolledCount: 4, tutorIdx: 2 },
    { title: "Arabic Language Basics", description: "Begin learning Arabic with this introductory course covering the alphabet, basic grammar, and essential vocabulary. Learn to read and write Arabic script, practice pronunciation with audio guides, and understand fundamental sentence structures. Gain insight into Arabic culture and traditions alongside language skills.", category: "Languages", skillLevel: "beginner" as const, duration: 80, maxStudents: 15, courseType: "upcoming" as const, thumbnailUrl: "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?w=800", totalLectures: 10, enrolledCount: 3, tutorIdx: 2 },

    { title: "Physics Fundamentals", description: "Explore the fundamental laws that govern our universe. Learn about mechanics, thermodynamics, waves, electricity, and magnetism through clear explanations and engaging demonstrations. Solve problems using mathematical tools and develop physical intuition that helps you understand natural phenomena all around you.", category: "Science", skillLevel: "intermediate" as const, duration: 90, maxStudents: 30, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800", totalLectures: 12, enrolledCount: 18, tutorIdx: 1, videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" },
    { title: "Chemistry Basics", description: "Discover the fascinating world of chemistry from atoms to reactions. Learn about the periodic table, chemical bonding, states of matter, acids and bases, and organic chemistry fundamentals. Enjoy virtual lab experiments and real-world applications that make chemistry come alive and relevant to daily life.", category: "Science", skillLevel: "beginner" as const, duration: 70, maxStudents: 25, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=800", totalLectures: 10, enrolledCount: 12, tutorIdx: 1 },
    { title: "Biology & Life Sciences", description: "Journey through the science of life from cells to ecosystems. Explore cell biology, genetics, evolution, human anatomy, ecology, and biodiversity. Understand how living organisms function, interact, and evolve. Includes virtual dissections, microscopy activities, and field study guides for independent exploration.", category: "Science", skillLevel: "beginner" as const, duration: 80, maxStudents: 35, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1530973428-5bf2db2e4d71?w=800", totalLectures: 11, enrolledCount: 21, tutorIdx: 1 },
    { title: "Environmental Science", description: "Understand the environmental challenges facing our planet and explore sustainable solutions. Study ecosystems, climate change, pollution, renewable energy, conservation biology, and environmental policy. Develop an informed perspective on environmental issues through data analysis, case studies, and community action projects.", category: "Science", skillLevel: "beginner" as const, duration: 55, maxStudents: 40, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800", totalLectures: 8, enrolledCount: 23, tutorIdx: 1 },
    { title: "Astronomy & Space Exploration", description: "Embark on a cosmic journey through our universe. Learn about stars, galaxies, black holes, the Big Bang, exoplanets, and the search for extraterrestrial life. Understand the tools and methods astronomers use to explore space. Includes stargazing guides and virtual telescope sessions for hands-on learning.", category: "Science", skillLevel: "beginner" as const, duration: 65, maxStudents: 50, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800", totalLectures: 9, enrolledCount: 30, tutorIdx: 1 },

    { title: "Digital Art & Design", description: "Unleash your creativity with digital art tools and design principles. Learn about color theory, composition, typography, digital illustration, and graphic design fundamentals. Work with industry-standard design concepts and create your own portfolio of digital artwork including logos, posters, and social media graphics.", category: "Creative Arts", skillLevel: "beginner" as const, duration: 80, maxStudents: 20, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800", totalLectures: 10, enrolledCount: 8, tutorIdx: 2 },
    { title: "Photography Basics", description: "Master the fundamentals of photography and start taking stunning photos. Learn about camera settings, exposure triangle, composition rules, lighting techniques, and post-processing basics. Practice with assignments covering portraits, landscapes, street photography, and still life. Develop your unique photographic eye.", category: "Creative Arts", skillLevel: "beginner" as const, duration: 55, maxStudents: 25, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800", totalLectures: 8, enrolledCount: 10, tutorIdx: 2 },
    { title: "Music Theory Fundamentals", description: "Understand the building blocks of music from notes to full compositions. Learn about scales, chords, rhythm, melody, harmony, and song structure. Develop your ear training and music reading skills. Apply theory to practical music creation regardless of your instrument or musical background.", category: "Creative Arts", skillLevel: "beginner" as const, duration: 50, maxStudents: 20, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800", totalLectures: 8, enrolledCount: 6, tutorIdx: 2 },

    { title: "Resume Writing & Interview Skills", description: "Land your dream job with a standout resume and polished interview skills. Learn to craft compelling resumes and cover letters, optimize your LinkedIn profile, and master behavioral interview techniques. Practice with mock interviews and receive feedback to boost your confidence and professional presentation.", category: "Career & Business", skillLevel: "beginner" as const, duration: 40, maxStudents: 30, courseType: "live" as const, thumbnailUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800", totalLectures: 5, enrolledCount: 19, tutorIdx: 2 },
    { title: "Entrepreneurship Fundamentals", description: "Turn your ideas into successful ventures with this comprehensive entrepreneurship course. Learn about market research, business planning, financial management, marketing strategies, and pitching to investors. Study case studies of successful startups and develop your own business plan throughout the course.", category: "Career & Business", skillLevel: "intermediate" as const, duration: 70, maxStudents: 20, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800", totalLectures: 9, enrolledCount: 7, tutorIdx: 2 },
    { title: "Career Planning & Goal Setting", description: "Create a clear roadmap for your professional future. Learn to identify your strengths, explore career options, set SMART goals, and develop actionable career plans. Includes self-assessment exercises, industry research techniques, networking strategies, and tools for tracking your professional development progress.", category: "Career & Business", skillLevel: "beginner" as const, duration: 35, maxStudents: 40, courseType: "on-demand" as const, thumbnailUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800", totalLectures: 6, enrolledCount: 25, tutorIdx: 2 },
  ];

  const createdClasses = [];
  for (const course of coursesData) {
    const tutor = tutors[course.tutorIdx];
    const ct = course.courseType as string;
    const schedDate = ct === "upcoming" ? futureDate3 :
                      ct === "live" ? futureDate :
                      ct === "recorded" ? recentDate : null;

    const [created] = await db.insert(classes).values({
      tutorId: tutor.id,
      title: course.title,
      description: course.description,
      category: course.category,
      skillLevel: course.skillLevel,
      duration: course.duration,
      maxStudents: course.maxStudents,
      status: "active",
      courseType: course.courseType,
      thumbnailUrl: course.thumbnailUrl,
      totalLectures: course.totalLectures,
      enrolledCount: course.enrolledCount,
      scheduleDate: schedDate,
      scheduleTime: course.courseType === "live" ? "10:00" : course.courseType === "upcoming" ? "14:00" : null,
      isFree: true,
      language: "English",
      videoUrl: (course as any).videoUrl || null,
      recordingUrl: (course as any).videoUrl || null,
      isRecordingAvailable: !!(course as any).videoUrl,
      recordingAvailableUntil: (course as any).videoUrl ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null,
      viewCount: Math.floor(course.enrolledCount * 1.5),
    }).returning();
    createdClasses.push(created);
  }

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14);
  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 7);

  await db.insert(bookings).values([
    { studentId: student1.id, classId: createdClasses[0].id, tutorId: tutor1.id, scheduledDate: futureDate, scheduledTime: "10:00", duration: 60, status: "confirmed" },
    { studentId: student2.id, classId: createdClasses[15].id, tutorId: tutor3.id, scheduledDate: futureDate, scheduledTime: "16:00", duration: 60, status: "confirmed" },
    { studentId: student1.id, classId: createdClasses[10].id, tutorId: tutor1.id, scheduledDate: futureDate2, scheduledTime: "14:00", duration: 45, status: "cancelled" },
    { studentId: student1.id, classId: createdClasses[27].id, tutorId: tutor2.id, scheduledDate: futureDate, scheduledTime: "09:00", duration: 90, status: "confirmed" },
    { studentId: student2.id, classId: createdClasses[32].id, tutorId: tutor3.id, scheduledDate: futureDate2, scheduledTime: "11:00", duration: 55, status: "confirmed" },
    // Completed bookings for analytics — totalHours and completionRate
    { studentId: student1.id, classId: createdClasses[1].id, tutorId: tutor1.id, scheduledDate: pastDate, scheduledTime: "10:00", duration: 90, status: "completed" },
    { studentId: student2.id, classId: createdClasses[27].id, tutorId: tutor2.id, scheduledDate: pastDate, scheduledTime: "14:00", duration: 60, status: "completed" },  // Physics
    { studentId: student3.id, classId: createdClasses[0].id, tutorId: tutor1.id, scheduledDate: pastDate2, scheduledTime: "09:00", duration: 120, status: "completed" },
    { studentId: student4.id, classId: createdClasses[15].id, tutorId: tutor3.id, scheduledDate: pastDate2, scheduledTime: "11:00", duration: 45, status: "completed" },  // Emotional Intelligence
    { studentId: student5.id, classId: createdClasses[10].id, tutorId: tutor1.id, scheduledDate: pastDate, scheduledTime: "15:00", duration: 60, status: "completed" },
    { studentId: student1.id, classId: createdClasses[2].id, tutorId: tutor1.id, scheduledDate: pastDate2, scheduledTime: "13:00", duration: 90, status: "completed" },
    // Cancelled booking for analytics variety
    { studentId: student3.id, classId: createdClasses[5].id, tutorId: tutor1.id, scheduledDate: pastDate, scheduledTime: "16:00", duration: 60, status: "cancelled" },
  ]);

  const reviewComments = [
    "Absolutely amazing course! The instructor explains concepts so clearly and the examples are very practical.",
    "Great course for beginners. I learned so much and the hands-on projects really helped solidify the concepts.",
    "The teacher is incredibly patient and knowledgeable. I feel much more confident in this subject now.",
    "Well-structured content with great pacing. The assignments were challenging but fair.",
    "I love how interactive this course is. The live sessions are engaging and the recordings are very helpful.",
    "Excellent teaching methodology. Complex topics are broken down into digestible pieces.",
    "This course exceeded my expectations. The instructor goes above and beyond to help students understand.",
    "Very practical and hands-on approach. I was able to apply what I learned immediately.",
    "The best course on this topic I've found. Clear explanations and lots of practice opportunities.",
    "Highly recommend! The instructor makes learning fun and the community is very supportive.",
  ];

  const reviewsData = [];
  for (let i = 0; i < Math.min(createdClasses.length, 20); i++) {
    const cls = createdClasses[i];
    const reviewer = i % 2 === 0 ? student1 : student2;
    const rating = [4, 5, 5, 4, 5, 4, 5, 5, 4, 5][i % 10];
    reviewsData.push({
      reviewerId: reviewer.id,
      revieweeId: cls.tutorId,
      classId: cls.id,
      rating,
      comment: reviewComments[i % reviewComments.length],
    });
  }

  if (reviewsData.length > 0) {
    await db.insert(reviews).values(reviewsData);
  }

  await db.insert(notifications).values([
    { userId: student1.id, type: "booking", title: "Booking Confirmed", message: "Your booking for Python Programming has been confirmed", isRead: false },
    { userId: student1.id, type: "system", title: "Welcome to TutorBridge!", message: "Start exploring courses and connect with tutors", isRead: true },
    { userId: student2.id, type: "system", title: "Class Tomorrow", message: "Don't forget your Digital Art class tomorrow at 10:00 AM", isRead: false },
    { userId: tutor1.id, type: "review", title: "New Review", message: "Kofi left you a 5-star review!", isRead: false },
    { userId: tutor1.id, type: "booking", title: "New Booking", message: "Nia has booked your Web Development class", isRead: false },
    { userId: tutor2.id, type: "system", title: "Profile Tip", message: "Add a profile photo to increase bookings by 40%", isRead: true },
    { userId: coordinator.id, type: "system", title: "Platform Update", message: "New safeguarding features have been enabled", isRead: false },
    { userId: coordinator.id, type: "system", title: "New User Signup", message: "3 new students joined this week", isRead: false },
  ]);

  await db.insert(safeguardingReports).values([
    { reporterId: student1.id, reportType: "inappropriate_content", targetType: "class", targetId: createdClasses[5]?.id || 1, description: "The class description contains language that may not be appropriate for younger students.", status: "pending" },
    { reporterId: student2.id, reportType: "safety_concern", targetType: "user", targetId: tutor3.id, description: "Tutor asked me to communicate outside the platform which feels unsafe.", status: "investigating" },
    { reporterId: null, reportType: "other", targetType: "message", targetId: null, description: "I noticed a user posting spam messages in multiple conversations.", status: "resolved" },
    // #59: harassment and additional safety_concern types for admin testing
    { reporterId: student3.id, reportType: "harassment", targetType: "user", targetId: student2.id, description: "Another student sent me repeated offensive messages calling me names during a live class session.", status: "pending" },
    { reporterId: student4.id, reportType: "harassment", targetType: "message", targetId: null, description: "I received a private message with bullying language from an unknown user. I felt very uncomfortable.", status: "investigating" },
    { reporterId: student5.id, reportType: "safety_concern", targetType: "user", targetId: tutor1.id, description: "The tutor shared personal contact details and asked students to connect on external social media, bypassing the platform.", status: "resolved" },
  ]);

  // ── LESSONS ────────────────────────────────────────────────────────────────
  const pythonClass = createdClasses[0];   // Python Programming for Beginners
  const webDevClass = createdClasses[1];   // Web Development with React
  const algebraClass = createdClasses[10]; // Algebra Made Easy
  const physicsClass = createdClasses[27]; // Physics Fundamentals

  const [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6] = await db.insert(lessons).values([
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Introduction to Python & Setup",
      description: "Get your environment ready and write your first Python program.",
      content: "Python is a high-level, interpreted, general-purpose programming language created by Guido van Rossum in 1991. It emphasizes code readability with clean, English-like syntax and uses indentation to define code blocks instead of curly braces. Python is used in web development, data science, artificial intelligence, automation, scientific research, and game development. Companies like Google, Instagram, Netflix, Dropbox, and NASA rely on Python. It consistently ranks as the world's most popular language (TIOBE Index, Stack Overflow surveys), making it the ideal first language to learn.",
      duration: 30, difficulty: "beginner",
      sections: [
        "Why Learn Python?||Python is the most popular programming language in the world. Key reasons to learn it:\n\n1. Simple syntax — reads almost like English, uses minimal punctuation\n2. Versatile — used for web development, data science, AI/ML, automation, scripting, and games\n3. Huge ecosystem — 300,000+ packages on PyPI (Python Package Index)\n4. High-demand career — Python developers are among the highest-paid in the tech industry\n5. Free and open source — massive community, free tutorials and resources\n6. Fast to learn — beginners can build useful programs within hours\n\nPython is taught in universities worldwide and dominates data science, machine learning, and scientific computing fields. Learning Python opens doors to web development with Django/Flask, data analysis with Pandas/NumPy, AI with TensorFlow/PyTorch, and automation scripts.",
        "Installing Python & VS Code||Step 1 — Download Python:\nGo to https://python.org/downloads and download Python 3.10 or higher.\nDuring installation: CHECK the box 'Add Python to PATH' — this is critical!\n\nStep 2 — Verify the installation:\nOpen Command Prompt (Windows) or Terminal (Mac/Linux).\nType: python --version\nYou should see: Python 3.x.x\nIf not found, try: python3 --version\n\nStep 3 — Install VS Code:\nDownload from https://code.visualstudio.com\nOpen VS Code and install the 'Python' extension by Microsoft from the Extensions panel (Ctrl+Shift+X on Windows).\n\nStep 4 — Create your workspace:\nCreate a folder called python_course on your Desktop.\nOpen it in VS Code: File > Open Folder.\nCreate a new file called hello.py.\n\nTroubleshooting:\n- If 'python' command is not found on Mac/Linux, use 'python3' instead\n- Make sure you checked 'Add Python to PATH' during installation\n- On Windows, you may need to restart Command Prompt after installing",
        "Your First Python Program||Type the following in hello.py:\n\n```python\nprint('Hello, World!')\nprint('My name is Kofi')\nprint('I am learning Python!')\n```\n\nRun it: Open the terminal in VS Code (Ctrl+`) and type: python hello.py\n\nExpected output:\nHello, World!\nMy name is Kofi\nI am learning Python!\n\nThe print() function displays text to the screen. Strings (text) are wrapped in single or double quotes — both work.\n\nComments — lines Python ignores completely:\n```python\n# This is a comment — Python skips this entire line\nprint('Active code')  # inline comment after the code\n```\n\nComments are essential for explaining your code to teammates and your future self. Always comment complex logic.",
        "Variables and Data Types||A variable is a named container that stores a value. Python automatically detects the data type (dynamic typing):\n\n```python\nname = 'Kofi'           # str  — text/string\nage = 16                # int  — whole number\ngpa = 3.85              # float — decimal number\nis_student = True       # bool — True or False\n```\n\nRules for variable names:\n- Must start with a letter or underscore (_)\n- Can contain letters, numbers, underscores only\n- Case-sensitive: name != Name != NAME\n- No spaces — use underscore: first_name, not first name\n- Avoid Python keywords: if, for, while, def, class, return, etc.\n\nArithmetic operators:\n+ addition | - subtraction | * multiply | / divide\n// floor division (drops decimal) | % modulo (remainder) | ** exponent\n\n```python\nprint(10 + 3)    # 13\nprint(10 - 3)    # 7\nprint(10 * 3)    # 30\nprint(10 / 3)    # 3.3333... (always returns float)\nprint(10 // 3)   # 3 (integer division, drops decimal)\nprint(10 % 3)    # 1 (remainder: 10 = 3x3 + 1)\nprint(2 ** 8)    # 256 (2 to the power of 8)\n```",
        "User Input and Type Conversion||The input() function pauses the program and reads keyboard input from the user:\n\n```python\nname = input('What is your name? ')\nprint('Hello,', name, '!')\n```\n\nIMPORTANT: input() ALWAYS returns a string. To do math, you must convert it first:\n\n```python\nage_str = input('Enter your age: ')   # returns '16' as a string\nage = int(age_str)                     # convert string to integer 16\nnext_year = age + 1\nprint('Next year you will be', next_year, 'years old.')\n```\n\nType conversion functions:\n- int('42')      converts string '42' to integer 42\n- float('3.14')  converts string '3.14' to float 3.14\n- str(100)       converts integer 100 to string '100'\n- bool(0)        converts 0 to False (0 and empty string are falsy)\n\nPractice Exercise:\nWrite a program that:\n1. Asks for the user's name\n2. Asks for their age as an integer\n3. Prints: 'Hello [name]! You will be [age+1] years old next year.'\n\nSample run:\nWhat is your name? Kofi\nEnter your age: 16\nHello Kofi! You will be 17 years old next year.",
      ],
    },
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Control Flow: if / else / loops",
      description: "Learn how to make decisions and repeat actions in Python.",
      content: "Control flow is what makes programs intelligent — it allows your code to make decisions, repeat actions, and respond differently to different inputs. Without control flow, a program just executes line by line with no logic. Python has three main control flow tools: if/elif/else for making decisions based on conditions, for loops for iterating over sequences a known number of times, and while loops for repeating code while a condition remains true. Mastering control flow is essential because virtually every real program uses these constructs.",
      duration: 45, difficulty: "beginner",
      sections: [
        "if / elif / else — Making Decisions||The if statement evaluates a condition. If True, the indented block runs. If False, Python moves on.\n\n```python\ngrade = 85\nif grade >= 90:\n    print('Grade: A — Excellent!')\nelif grade >= 80:\n    print('Grade: B — Good job!')\nelif grade >= 70:\n    print('Grade: C — Keep studying!')\nelse:\n    print('Grade: F — Please see the tutor')\n```\n\nComparison operators used in conditions:\n== equal to | != not equal to | > greater than | < less than\n>= greater or equal | <= less or equal\n\nLogical operators for combining conditions:\nand — BOTH conditions must be True\nor  — AT LEAST ONE must be True\nnot — reverses True to False and vice versa\n\n```python\nage = 17\nhas_id = True\nif age >= 18 and has_id:\n    print('Welcome, you may enter')\nelse:\n    print('Access denied')\n```\n\nCRITICAL: INDENTATION in Python defines code blocks. Always use 4 spaces (or 1 Tab) to indent the body of an if statement. Wrong indentation causes errors.",
        "for Loops — Iterating Over Sequences||A for loop repeats a block of code once for each item in a sequence (list, string, range, etc.):\n\n```python\nfruits = ['apple', 'banana', 'mango', 'orange']\nfor fruit in fruits:\n    print('I like', fruit)\n```\n\nOutput:\nI like apple\nI like banana\nI like mango\nI like orange\n\nUsing range() to loop a specific number of times:\n```python\nfor i in range(5):        # 0, 1, 2, 3, 4\n    print('Count:', i)\n\nfor i in range(1, 6):     # 1, 2, 3, 4, 5\n    print('Number:', i)\n\nfor i in range(0, 10, 2): # 0, 2, 4, 6, 8 (step of 2)\n    print(i)\n```\n\nLooping over a string character by character:\n```python\nword = 'Python'\nfor letter in word:\n    print(letter)  # prints P, y, t, h, o, n on separate lines\n```\n\nUseful keywords inside loops:\n- break — exits the loop completely and immediately\n- continue — skips the rest of the current iteration, jumps to next\n\nenumerate() — gives both index and value together:\n```python\nfor index, fruit in enumerate(fruits):\n    print(index, '-', fruit)  # 0 - apple, 1 - banana...\n```",
        "while Loops — Repeating While a Condition is True||A while loop keeps running as long as its condition evaluates to True:\n\n```python\ncount = 0\nwhile count < 5:\n    print('Count is:', count)\n    count += 1            # += means count = count + 1\nprint('Loop is done!')\n```\n\nOutput:\nCount is: 0\nCount is: 1\nCount is: 2\nCount is: 3\nCount is: 4\nLoop is done!\n\nWARNING — Infinite loops: If the condition never becomes False, the loop runs forever and crashes your program. Always ensure the loop has a proper exit condition.\n\nUseful pattern — input validation loop:\n```python\npassword = ''\nwhile password != 'secret123':\n    password = input('Enter password: ')\nprint('Access granted!')\n```\n\nfor vs while — when to use each:\n- Use for when you know how many times to loop OR you are looping over a list/string\n- Use while when you do NOT know in advance how many times (depends on user input or a changing condition)\n\nNested loops — a loop inside a loop:\n```python\nfor row in range(1, 4):\n    for col in range(1, 4):\n        print(row * col, end='\\t')  # tab-separated\n    print()  # newline after each row\n```\nOutput: Multiplication table (1-3 x 1-3)",
        "Loop Practice Exercises||Exercise 1: Print all even numbers from 2 to 20.\n```python\nfor i in range(2, 21, 2):\n    print(i)\n```\n\nExercise 2: Sum all numbers from 1 to 100.\n```python\ntotal = 0\nfor i in range(1, 101):\n    total += i\nprint('Sum:', total)   # Sum: 5050\n```\n\nExercise 3: Number guessing game.\n```python\nsecret = 7\nguess = 0\nwhile guess != secret:\n    guess = int(input('Guess a number (1-10): '))\n    if guess < secret:\n        print('Too low!')\n    elif guess > secret:\n        print('Too high!')\nprint('Correct! The answer was', secret)\n```\n\nExercise 4: FizzBuzz — print numbers 1-30, but print 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for multiples of both.\n\n```python\nfor i in range(1, 31):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)\n```\n\nFizzBuzz is a classic programming interview question — make sure you can solve it!",
      ],
    },
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Functions & Modules",
      description: "Organise your code into reusable functions and import modules.",
      content: "Functions are one of the most important concepts in programming. A function is a named, reusable block of code that performs a specific task. Instead of writing the same code multiple times, you define it once in a function and call it anywhere in your program. Functions make code shorter, more readable, easier to test, and easier to maintain. Python has many built-in functions like print(), len(), and input(), and also lets you define your own. Python's standard library provides hundreds of ready-to-use modules for math, randomness, file handling, networking, and much more.",
      duration: 40, difficulty: "beginner",
      sections: [
        "Defining and Calling Functions||Use the def keyword followed by the function name, parentheses, and a colon. The function body is indented by 4 spaces:\n\n```python\ndef greet():\n    print('Hello, everyone!')\n    print('Welcome to Python!')\n\ngreet()    # call the function — runs the indented block\ngreet()    # call it again to reuse the same code\n```\n\nFunctions with parameters (inputs):\n```python\ndef greet(name):\n    print(f'Hello, {name}!')\n\ngreet('Kofi')    # Hello, Kofi!\ngreet('Amara')   # Hello, Amara!\ngreet('James')   # Hello, James!\n```\n\nf-strings (formatted strings): Put f before the quote. Variables and expressions inside {} are evaluated and inserted.\n\n```python\nname = 'Kofi'\nage = 16\nprint(f'My name is {name} and I am {age} years old.')\nprint(f'Next year I will be {age + 1}.')\n```",
        "Parameters, Arguments, and Return Values||Parameters are variable names in the function definition. Arguments are the actual values you pass when calling.\n\n```python\ndef add(a, b):           # a and b are PARAMETERS\n    result = a + b\n    return result        # return sends the value back to the caller\n\nsum1 = add(3, 4)        # 3 and 4 are ARGUMENTS — stored in a=3, b=4\nprint(sum1)             # 7\nprint(add(10, 25))      # 35\n```\n\nFunctions with multiple parameters and complex logic:\n```python\ndef calculate_grade(score, total):\n    percentage = (score / total) * 100\n    if percentage >= 90:\n        return 'A'\n    elif percentage >= 80:\n        return 'B'\n    elif percentage >= 70:\n        return 'C'\n    else:\n        return 'F'\n\nprint(calculate_grade(45, 50))   # A (90%)\nprint(calculate_grade(32, 50))   # C (64%)\n```\n\nDefault parameter values — used when no argument is provided:\n```python\ndef greet(name, greeting='Hello'):\n    print(f'{greeting}, {name}!')\n\ngreet('Kofi')               # Hello, Kofi!\ngreet('Amara', 'Good day')  # Good day, Amara!\n```\n\nReturning multiple values:\n```python\ndef min_max(numbers):\n    return min(numbers), max(numbers)\n\nlow, high = min_max([3, 1, 7, 2, 9])\nprint(low, high)   # 1 9\n```",
        "Scope — Local vs Global Variables||Variables defined INSIDE a function are LOCAL — they only exist within that function and are destroyed when the function ends:\n\n```python\ndef my_function():\n    local_var = 'I only exist inside this function'\n    print(local_var)   # works fine\n\nmy_function()\nprint(local_var)       # ERROR! NameError: local_var is not defined\n```\n\nVariables defined OUTSIDE all functions are GLOBAL — they can be read anywhere:\n```python\nplatform_name = 'TutorBridge'\n\ndef show_platform():\n    print('Learning on:', platform_name)   # can READ global\n\nshow_platform()    # Learning on: TutorBridge\n```\n\nBest practices for functions:\n1. Give functions descriptive names using lowercase and underscores: calculate_total(), send_email()\n2. A function should do ONE thing only (Single Responsibility Principle)\n3. Keep functions short — if it's longer than 20 lines, consider splitting it\n4. Always add a docstring to describe what the function does:\n\n```python\ndef calculate_area(length, width):\n    '''Returns the area of a rectangle given its length and width.'''\n    return length * width\n\nprint(calculate_area.__doc__)  # shows the docstring\n```",
        "Built-in Functions and Importing Modules||Python has many built-in functions ready to use without any imports:\n\nlen(x)      — length of string or list: len('hello') = 5\nmax(...)    — largest value: max(3, 7, 2) = 7\nmin(...)    — smallest value: min(3, 7, 2) = 2\nsum(list)   — total: sum([1, 2, 3]) = 6\nabs(x)      — absolute value: abs(-5) = 5\nround(x)    — round to nearest integer: round(3.7) = 4\ntype(x)     — get data type: type(42) = <class 'int'>\nsorted(x)   — sorted list: sorted([3,1,2]) = [1,2,3]\nreversed(x) — reversed sequence\nzip(a,b)    — pairs elements from two lists\n\nImporting standard library modules (come with Python, no install needed):\n```python\nimport math\nprint(math.sqrt(16))       # 4.0\nprint(math.pi)             # 3.14159265...\nprint(math.floor(3.9))     # 3\nprint(math.ceil(3.1))      # 4\nprint(math.factorial(5))   # 120\n\nimport random\nprint(random.randint(1, 6))              # random integer 1-6 (dice)\nprint(random.choice(['rock','paper','scissors']))  # random element\nrandom.shuffle([1,2,3,4,5])             # shuffle a list in place\n\nimport datetime\ntoday = datetime.date.today()\nprint('Today is:', today)                # 2024-01-15\n```\n\nInstalling third-party packages with pip (in your terminal):\npip install requests    # for making HTTP web requests\npip install numpy       # fast numerical computing\npip install pandas      # data analysis and DataFrames",
      ],
    },
    {
      classId: webDevClass.id, tutorId: tutor1.id,
      title: "HTML & CSS Foundations",
      description: "Build the visual skeleton of a web page with HTML and style it with CSS.",
      content: "HTML defines structure; CSS controls presentation.",
      duration: 60, difficulty: "beginner",
      sections: [
        "HTML Document Structure||```html\n<!DOCTYPE html>\n<html>\n  <head><title>My Page</title></head>\n  <body><h1>Hello!</h1></body>\n</html>\n```",
        "Common HTML Tags||Headings (h1–h6), paragraphs (p), links (a href), images (img src), lists (ul/ol/li), divs and spans.",
        "CSS Selectors & Box Model||Target elements with class (.btn), id (#header), or tag (p) selectors. Every element has margin, border, padding, and content.",
      ],
    },
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Variables and Expressions",
      description: "Understand what algebra variables are and how to form expressions.",
      content: "Algebra is the branch of mathematics that uses letters and symbols to represent numbers and quantities in formulas and equations. It is the foundation for advanced math topics like calculus, statistics, and linear algebra, and is directly applied in computer programming, physics, engineering, and economics. In algebra, letters called variables (such as x, y, n, a) stand for unknown or changing values. Learning to work with variables, expressions, and equations allows you to solve real-world problems — from calculating costs to programming algorithms. Every student of mathematics, science, or technology needs a solid algebra foundation.",
      duration: 35, difficulty: "beginner",
      sections: [
        "What is a Variable?||A variable is a letter that represents an unknown or changing number. The most common variables are x, y, n, and a, but any letter can be used.\n\nReal-world examples:\n- Kofi has x apples and buys 3 more → total apples = x + 3\n- A shirt costs d dollars and there are 5 shirts → total cost = 5d\n- A car travels at v km/h for 2 hours → distance = 2v\n- A rectangle has length l and width w → Area = l × w\n\nWhy variables are powerful:\nVariables let us write ONE formula that works for ANY numbers.\nFor example: Area of a rectangle = length × width = l × w\nWorks whether l=5, w=3 (area=15) or l=100, w=50 (area=5000).\n\nAlgebra notation shortcuts:\n- 3x means 3 × x (multiplication sign omitted between number and variable)\n- xy means x × y\n- x² means x × x (x squared)\n- x³ means x × x × x (x cubed)\n- x/4 means x ÷ 4\n- (x + 2) means evaluate x+2 first (grouping with parentheses)",
        "Algebraic Expressions — Building and Simplifying||An algebraic expression combines variables, numbers, and operations — it has NO equals sign (that would make it an equation).\n\nExamples of expressions: 3x + 5, 2a - 7, x² + 2x + 1, 4(n + 3)\n\nKey vocabulary:\n- Term: a single number, variable, or product (e.g., 3x, -5, x², 4y)\n- Coefficient: the number multiplying the variable (in 3x, coefficient = 3; in -5y, coefficient = -5)\n- Constant: a term with no variable (e.g., 5, -7, 100)\n- Like terms: terms with the SAME variable AND exponent\n\nSimplifying — combining like terms (only like terms can be combined):\n3x + 5x = 8x              (both have x — add coefficients: 3+5=8)\n7y - 2y = 5y              (both have y — subtract: 7-2=5)\n4x + 3y - x + 2y = 3x + 5y  (group x terms: 4x-x=3x; group y terms: 3y+2y=5y)\n2x² + 5x - x² + 3x = x² + 8x  (group x² terms: 2-1=1; group x terms: 5+3=8)\n\nCANNOT combine unlike terms:\n3x + 5y  → cannot simplify (different variables)\n2x + 3x² → cannot simplify (different exponents)\n\nUsing the Distributive Property: a(b + c) = ab + ac\n4(x + 3) = 4x + 12\n-2(3x - 5) = -6x + 10    (multiply every term inside the brackets)",
        "Evaluating Expressions — Substituting Values||To evaluate an expression, replace each variable with its given value and calculate using order of operations.\n\nExample 1: Evaluate 2x + 3 when x = 5\nStep 1: Replace x with 5 → 2(5) + 3\nStep 2: Multiply → 10 + 3\nStep 3: Add → 13\n\nExample 2: Evaluate 3a² - 4a + 1 when a = 2\nStep 1: Replace a → 3(2²) - 4(2) + 1\nStep 2: Exponent first → 3(4) - 4(2) + 1\nStep 3: Multiply → 12 - 8 + 1\nStep 4: Left to right → 5\n\nExample 3: Evaluate (x + y)(x - y) when x = 6, y = 2\nStep 1: (6+2)(6-2)\nStep 2: (8)(4)\nAnswer: 32\n\nPractice problems (try these yourself):\n1. Find 4n + 7 when n = 3       [Answer: 19]\n2. Find 5x - 2y when x=4, y=6  [Answer: 8]\n3. Find a² + b² when a=3, b=4  [Answer: 25]\n4. Find 2(p + 3) when p = 7    [Answer: 20]",
        "Order of Operations (PEMDAS/BODMAS)||When an expression has multiple operations, follow this strict order:\n\nPEMDAS (USA) / BODMAS (UK):\nP/B — Parentheses/Brackets first\nE/O — Exponents/Orders (powers and roots) second\nM/D — Multiplication and Division (left to right, equal priority)\nA/S — Addition and Subtraction (left to right, equal priority)\n\nMemory trick: 'Please Excuse My Dear Aunt Sally'\n\nStep-by-step examples:\n\n2 + 3 × 4\n= 2 + 12        (multiply BEFORE add)\n= 14             NOT 20! (common mistake)\n\n(2 + 3) × 4\n= 5 × 4          (parentheses FIRST)\n= 20\n\n3² + 4 × 2 - 1\n= 9 + 4 × 2 - 1  (exponent first: 3²=9)\n= 9 + 8 - 1      (multiply next: 4×2=8)\n= 16             (left to right: 9+8=17, 17-1=16)\n\n24 ÷ (2 × 3) + 5²\n= 24 ÷ 6 + 25    (brackets: 2×3=6; exponent: 5²=25)\n= 4 + 25         (divide: 24÷6=4)\n= 29\n\nCommon mistakes to avoid:\n- Doing addition BEFORE multiplication (always multiply/divide first)\n- Forgetting to evaluate inside parentheses first\n- Treating multiplication and division as having different priority (they are equal — go left to right)",
      ],
    },
    {
      classId: physicsClass.id, tutorId: tutor2.id,
      title: "Motion and Kinematics",
      description: "Describe how objects move using distance, speed, velocity and acceleration.",
      content: "Kinematics is the study of motion without considering its causes.",
      duration: 50, difficulty: "intermediate",
      sections: [
        "Distance vs Displacement||Distance is the total path length. Displacement is the straight-line change in position (has direction).",
        "Speed vs Velocity||Speed = distance/time (no direction). Velocity = displacement/time (has direction).\nExample: v = 20 m/s north.",
        "Acceleration||Acceleration = change in velocity / time = (v_f − v_i) / t.\nExample: Car goes from 0 to 60 km/h in 5 s → a = 12 km/h/s",
      ],
    },
  ]).returning();

  // Assign individual video URLs to seeded lessons (using free sample MP4s)
  const SAMPLE_VIDEOS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  ];
  for (let i = 0; i < [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6].length; i++) {
    const l = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6][i];
    await db.update(lessons).set({ videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length] }).where(eq(lessons.id, l.id));
  }

  // Additional lessons for richer course content across categories
  const aiClass = createdClasses[2];      // Introduction to Artificial Intelligence
  const emotionalClass = createdClasses[15]; // Emotional Intelligence Mastery
  const biologyClass = createdClasses[29];   // Biology & Life Sciences

  await db.insert(lessons).values([
    // Web Development — 2 more lessons
    {
      classId: webDevClass.id, tutorId: tutor1.id,
      title: "JavaScript Essentials",
      description: "Learn the core concepts of JavaScript to make your web pages interactive.",
      content: "JavaScript is the programming language of the web.",
      duration: 55, difficulty: "beginner",
      sections: [
        "Variables & Data Types||Use `let` and `const` to declare variables.\n```javascript\nlet name = 'Kofi';\nconst age = 16;\nlet isStudent = true;\n```\nJavaScript has strings, numbers, booleans, arrays, and objects.",
        "Functions & Events||```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\ndocument.getElementById('btn')\n  .addEventListener('click', () => {\n    alert(greet('Kofi'));\n  });\n```",
        "DOM Manipulation||The Document Object Model lets you change HTML with JS.\n```javascript\ndocument.querySelector('h1').textContent = 'Welcome!';\ndocument.querySelector('.card').style.display = 'none';\n```",
      ],
    },
    {
      classId: webDevClass.id, tutorId: tutor1.id,
      title: "React Components & State",
      description: "Build interactive UIs with React components and manage state.",
      content: "React is a JavaScript library for building user interfaces using reusable components.",
      duration: 65, difficulty: "intermediate",
      sections: [
        "What is a Component?||A component is a reusable piece of UI.\n```jsx\nfunction Welcome({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}\n```\nComponents can be nested: `<App>` → `<Header>` → `<Nav>`",
        "State with useState||```jsx\nimport { useState } from 'react';\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(count + 1)}>\n      Clicked {count} times\n    </button>\n  );\n}\n```",
        "Props vs State||**Props** = data passed from parent (read-only).\n**State** = data managed inside a component (can change).\nUse props for configuration, state for interactivity.",
      ],
    },
    // Algebra — 2 more lessons
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Solving One-Step Equations",
      description: "Learn to solve simple equations by performing inverse operations.",
      content: "An equation is like a balance scale — what you do to one side, you must do to the other.",
      duration: 30, difficulty: "beginner",
      sections: [
        "Addition Equations||Solve x + 7 = 12:\nSubtract 7 from both sides → x = 5\n\nCheck: 5 + 7 = 12 ✓",
        "Multiplication Equations||Solve 3x = 21:\nDivide both sides by 3 → x = 7\n\nCheck: 3 × 7 = 21 ✓",
        "Practice Problems||1. x + 9 = 15  →  x = ?\n2. 5x = 35  →  x = ?\n3. x - 4 = 10  →  x = ?\n4. x/2 = 8  →  x = ?\n\nAnswers: 6, 7, 14, 16",
      ],
    },
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Graphing Linear Equations",
      description: "Plot equations on a coordinate plane and understand slope-intercept form.",
      content: "Every linear equation can be written as y = mx + b where m is slope and b is y-intercept.",
      duration: 40, difficulty: "intermediate",
      sections: [
        "The Coordinate Plane||The x-axis runs horizontally, y-axis vertically. Points are written as (x, y).\nExample: (3, 4) means go 3 right and 4 up from origin.",
        "Slope-Intercept Form||y = mx + b\n- m = slope (rise/run) = how steep the line is\n- b = y-intercept = where the line crosses the y-axis\n\nExample: y = 2x + 1 → slope is 2, crosses y-axis at 1",
        "Plotting Points||For y = 2x + 1, make a table:\nx = 0 → y = 1 → point (0,1)\nx = 1 → y = 3 → point (1,3)\nx = 2 → y = 5 → point (2,5)\nConnect the dots for a straight line.",
      ],
    },
    // Physics — 2 more lessons
    {
      classId: physicsClass.id, tutorId: tutor2.id,
      title: "Forces and Newton's Laws",
      description: "Understand the three laws of motion and how forces affect objects.",
      content: "Forces are pushes or pulls that can change an object's motion.",
      duration: 50, difficulty: "intermediate",
      sections: [
        "Newton's First Law (Inertia)||An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an external force.\nExample: A book on a table stays still unless you push it.",
        "Newton's Second Law (F = ma)||Force = mass × acceleration.\nIf you push a 5 kg box with 10 N of force: a = F/m = 10/5 = 2 m/s²\nMore mass → more force needed for same acceleration.",
        "Newton's Third Law||For every action, there is an equal and opposite reaction.\nWhen you sit on a chair, you push down on it (gravity), and the chair pushes up on you (normal force).",
      ],
    },
    {
      classId: physicsClass.id, tutorId: tutor2.id,
      title: "Energy, Work, and Power",
      description: "Learn about different forms of energy and how work transfers energy.",
      content: "Energy is the ability to do work. Work is done when a force moves an object.",
      duration: 45, difficulty: "intermediate",
      sections: [
        "Types of Energy||**Kinetic Energy** = energy of motion = ½mv²\n**Potential Energy** = stored energy = mgh\n**Thermal Energy** = heat from particle movement\n**Chemical Energy** = stored in bonds (food, fuel)",
        "Work & Power||**Work** = Force × Distance × cos(θ)\nUnit: Joules (J)\n\n**Power** = Work / Time\nUnit: Watts (W)\n\nExample: Lifting a 10 kg box 2m high: W = 10 × 9.8 × 2 = 196 J",
        "Conservation of Energy||Energy cannot be created or destroyed, only transformed.\nA falling ball: Potential Energy → Kinetic Energy\nTotal energy stays the same (ignoring air resistance).",
      ],
    },
    // AI Introduction — 2 lessons
    {
      classId: aiClass.id, tutorId: tutor1.id,
      title: "What is Artificial Intelligence?",
      description: "Understand what AI is, its history, and different types of AI systems.",
      content: "AI is the simulation of human intelligence in machines that are programmed to think and learn.",
      duration: 40, difficulty: "beginner",
      sections: [
        "Types of AI||**Narrow AI** (Weak AI): Designed for specific tasks — Siri, chess engines, spam filters.\n**General AI** (Strong AI): Hypothetical AI that can do any intellectual task a human can.\n**Super AI**: Theoretical AI that surpasses human intelligence.",
        "How AI Works||AI learns from data using algorithms:\n1. **Input** → data (images, text, numbers)\n2. **Processing** → algorithm finds patterns\n3. **Output** → prediction or decision\n\nMore data + better algorithm = smarter AI",
        "AI in Everyday Life||- Voice assistants (Alexa, Siri)\n- Recommendation systems (Netflix, YouTube)\n- Navigation (Google Maps)\n- Social media feeds\n- Email spam detection\n- Auto-correct on your phone",
      ],
    },
    {
      classId: aiClass.id, tutorId: tutor1.id,
      title: "Machine Learning Basics",
      description: "Learn how machines learn from data without being explicitly programmed.",
      content: "Machine Learning is a subset of AI where computers learn patterns from data.",
      duration: 50, difficulty: "intermediate",
      sections: [
        "Supervised Learning||Train with labeled data (input → correct output).\nExamples:\n- Email → Spam or Not Spam\n- Image → Cat or Dog\n- House features → Price prediction",
        "Unsupervised Learning||Find hidden patterns in unlabeled data.\nExamples:\n- Customer segmentation\n- Anomaly detection\n- Topic discovery in documents",
        "Training a Model||1. Collect and clean data\n2. Split into training set (80%) and test set (20%)\n3. Choose an algorithm\n4. Train the model on training data\n5. Evaluate accuracy on test data\n6. Tune and improve",
      ],
    },
    // Emotional Intelligence — 2 lessons
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Understanding Your Emotions",
      description: "Learn to identify, name, and understand the emotions you experience daily.",
      content: "Emotional intelligence starts with self-awareness — knowing what you feel and why.",
      duration: 30, difficulty: "beginner",
      sections: [
        "The Emotion Wheel||Basic emotions: Joy, Sadness, Anger, Fear, Surprise, Disgust.\nEach has variations — anger includes frustration, irritation, rage.\nNaming your emotion precisely helps you manage it better.",
        "Emotional Triggers||Triggers are situations that provoke strong emotions.\nExercise: Think of a time you felt angry. What happened just before?\nRecognizing triggers gives you a 'pause' before reacting.",
        "Journaling Exercise||Write for 5 minutes about how you feel right now.\nQuestions to answer:\n- What emotion am I feeling?\n- What triggered it?\n- Where do I feel it in my body?\n- On a scale of 1-10, how intense is it?",
      ],
    },
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Empathy and Active Listening",
      description: "Develop the ability to understand and share the feelings of others.",
      content: "Empathy is the foundation of strong relationships and effective communication.",
      duration: 35, difficulty: "beginner",
      sections: [
        "What is Empathy?||**Cognitive empathy** = understanding someone's perspective\n**Emotional empathy** = feeling what they feel\n**Compassionate empathy** = understanding + feeling + wanting to help\n\nAll three are skills you can develop.",
        "Active Listening Skills||1. Give full attention (no phone!)\n2. Don't interrupt\n3. Reflect back: 'It sounds like you feel...'\n4. Ask open questions: 'How did that make you feel?'\n5. Validate: 'That makes sense that you'd feel that way.'",
        "Practice Scenario||Your friend says: 'Nobody picked me for the team again.'\n\n❌ 'It doesn't matter, it's just a game.'\n✅ 'That must feel really disappointing. Do you want to talk about it?'\n\nThe second response validates their feelings.",
      ],
    },
    // Biology — 2 lessons
    {
      classId: biologyClass.id, tutorId: tutor2.id,
      title: "Cells: The Building Blocks of Life",
      description: "Explore the structure and function of cells — the basic unit of all living things.",
      content: "Every living organism is made of cells, from single-celled bacteria to trillion-celled humans.",
      duration: 45, difficulty: "beginner",
      sections: [
        "Animal vs Plant Cells||Both have: nucleus, cell membrane, cytoplasm, mitochondria, ribosomes.\n\n**Plant cells also have:** cell wall, chloroplasts (for photosynthesis), large central vacuole.",
        "Cell Organelles||**Nucleus** — 'brain' of the cell, contains DNA\n**Mitochondria** — 'powerhouse', makes energy (ATP)\n**Ribosomes** — make proteins\n**Cell membrane** — controls what enters/exits\n**Endoplasmic Reticulum** — transport system",
        "Cell Division (Mitosis)||Cells divide to grow and repair:\n1. **Interphase** — cell grows, DNA copies\n2. **Prophase** — chromosomes condense\n3. **Metaphase** — chromosomes line up\n4. **Anaphase** — chromosomes pull apart\n5. **Telophase** — two new nuclei form\n→ Result: 2 identical daughter cells",
      ],
    },
    {
      classId: biologyClass.id, tutorId: tutor2.id,
      title: "Genetics and DNA",
      description: "Understand how traits are inherited through DNA and genes.",
      content: "DNA carries the instructions for building and maintaining every living organism.",
      duration: 50, difficulty: "intermediate",
      sections: [
        "What is DNA?||DNA (Deoxyribonucleic Acid) is a double helix molecule found in the nucleus.\nIt's made of 4 bases: Adenine (A), Thymine (T), Guanine (G), Cytosine (C).\nBase pairing: A-T and G-C.",
        "Genes and Chromosomes||**Gene** = a section of DNA that codes for a trait (e.g., eye color)\n**Chromosome** = a long strand of coiled DNA\nHumans have 46 chromosomes (23 pairs).\nYou get 23 from your mother and 23 from your father.",
        "Dominant and Recessive Traits||Each trait has two alleles (versions).\n**Dominant** (B) — shows even with one copy\n**Recessive** (b) — shows only with two copies\n\nBB or Bb → Dominant trait appears\nbb → Recessive trait appears\n\nExample: Brown eyes (B) is dominant over blue eyes (b).",
      ],
    },
  ]);

  // ── COMPREHENSIVE LECTURE-NOTE LESSONS: Python (3) + Algebra (3) ───────────
  await db.insert(lessons).values([
    // ── Python: Lists and Dictionaries ───────────────────────────────────────
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Lists and Dictionaries",
      description: "Master Python's two most important data structures for storing and organising collections of data.",
      content: "Lists and dictionaries are Python's most used data structures. A list is an ordered, mutable sequence of items — you can store any mix of data types and change the list after creation. A dictionary is an unordered collection of key-value pairs — like a real dictionary where you look up a word (key) to find its definition (value). Together these two structures can model virtually any real-world dataset: a list of students, a dictionary of course grades, a list of dictionaries representing a database table. Mastering them is essential for every Python programmer.",
      duration: 55, difficulty: "beginner",
      sections: [
        "Python Lists — Creating and Accessing||A list stores multiple items in a single variable, in order, using square brackets:\n\n```python\nfruits = ['apple', 'banana', 'mango', 'orange']\nscores = [95, 87, 72, 100, 63]\nmixed = ['Kofi', 16, True, 3.85]   # any data types\nempty = []                          # empty list\n```\n\nAccessing items by INDEX (starts at 0):\n```python\nprint(fruits[0])    # 'apple'   (first item)\nprint(fruits[1])    # 'banana'  (second item)\nprint(fruits[-1])   # 'orange'  (last item — negative index)\nprint(fruits[-2])   # 'mango'   (second-to-last)\n```\n\nSlicing — getting a sub-list:\n```python\nprint(fruits[1:3])  # ['banana', 'mango'] (index 1 up to BUT NOT including 3)\nprint(fruits[:2])   # ['apple', 'banana'] (from start to index 2)\nprint(fruits[2:])   # ['mango', 'orange'] (from index 2 to end)\nprint(fruits[::-1]) # ['orange', 'mango', 'banana', 'apple'] (reversed)\n```\n\nChecking length and membership:\n```python\nprint(len(fruits))          # 4\nprint('mango' in fruits)    # True\nprint('grape' in fruits)    # False\n```",
        "List Methods — Modifying Lists||Lists are mutable — you can change them after creation. Python provides many built-in methods:\n\n```python\nstudents = ['Kofi', 'Amara', 'James']\n\n# Adding items\nstudents.append('Nia')          # adds to END: [..., 'Nia']\nstudents.insert(1, 'Emeka')     # inserts at index 1\nstudents.extend(['Sara', 'Tom']) # adds multiple items from another list\n\n# Removing items\nstudents.remove('James')        # removes first match by VALUE\npopped = students.pop()         # removes and returns last item\npopped2 = students.pop(0)       # removes and returns item at index 0\ndel students[1]                 # deletes item at index 1\n\n# Searching and sorting\nprint(students.index('Amara'))  # returns index of 'Amara'\nprint(students.count('Kofi'))   # how many times 'Kofi' appears\nstudents.sort()                 # sort alphabetically IN PLACE\nstudents.sort(reverse=True)     # sort reverse alphabetical\nstudents.reverse()              # reverse the list order\n\n# Useful functions with lists\nnumbers = [5, 2, 8, 1, 9, 3]\nprint(min(numbers))    # 1\nprint(max(numbers))    # 9\nprint(sum(numbers))    # 28\nprint(sorted(numbers)) # [1, 2, 3, 5, 8, 9] — returns new sorted list\n```\n\nList comprehension — a concise way to create lists:\n```python\nsquares = [x**2 for x in range(1, 6)]  # [1, 4, 9, 16, 25]\nevens = [x for x in range(20) if x % 2 == 0]  # [0,2,4,...,18]\nnames_upper = [name.upper() for name in students]\n```",
        "Python Dictionaries — Key-Value Storage||A dictionary stores data as key:value pairs in curly braces. Keys must be unique and immutable (strings or numbers). Values can be anything:\n\n```python\nstudent = {\n    'name': 'Kofi Mensah',\n    'age': 16,\n    'grade': 'A',\n    'gpa': 3.85,\n    'is_enrolled': True\n}\n```\n\nAccessing values by key:\n```python\nprint(student['name'])      # 'Kofi Mensah'\nprint(student['gpa'])       # 3.85\nprint(student.get('age'))   # 16 (safer — returns None if key missing)\nprint(student.get('phone', 'N/A'))  # 'N/A' (default if key not found)\n```\n\nModifying dictionaries:\n```python\nstudent['grade'] = 'A+'         # update existing key\nstudent['school'] = 'TutorBridge Academy'  # add new key\ndel student['is_enrolled']      # delete a key\nstudent.pop('age')               # remove key and return its value\n```\n\nUseful dictionary methods:\n```python\nprint(student.keys())    # all keys: dict_keys(['name', 'grade', 'gpa', ...])\nprint(student.values())  # all values\nprint(student.items())   # all key-value pairs as tuples\nprint('name' in student) # True — check if key exists\nprint(len(student))      # number of key-value pairs\n```\n\nLooping through a dictionary:\n```python\nfor key, value in student.items():\n    print(f'{key}: {value}')\n```",
        "Lists of Dictionaries — Real-World Data||The most common pattern in real programs: a list where each item is a dictionary (like rows in a database table):\n\n```python\nstudents = [\n    {'name': 'Kofi',  'age': 16, 'grade': 'A', 'score': 95},\n    {'name': 'Amara', 'age': 15, 'grade': 'B', 'score': 82},\n    {'name': 'James', 'age': 17, 'grade': 'A', 'score': 91},\n    {'name': 'Nia',   'age': 16, 'grade': 'C', 'score': 74},\n]\n\n# Access the second student's name\nprint(students[1]['name'])   # 'Amara'\n\n# Loop through all students\nfor student in students:\n    print(f\"{student['name']} scored {student['score']}\")\n\n# Filter: only students with grade A\na_students = [s for s in students if s['grade'] == 'A']\nprint(len(a_students))  # 2\n\n# Find the highest scorer\nbest = max(students, key=lambda s: s['score'])\nprint(f\"Top student: {best['name']} with {best['score']}\")\n\n# Sort by score (descending)\nsorted_students = sorted(students, key=lambda s: s['score'], reverse=True)\nfor s in sorted_students:\n    print(s['name'], s['score'])\n```\n\nThis pattern is how web APIs return data (as JSON), how databases are queried, and how Python processes spreadsheet rows.",
      ],
    },
    // ── Python: Object-Oriented Programming ──────────────────────────────────
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Object-Oriented Programming (OOP)",
      description: "Learn to model real-world objects using Python classes and objects — the foundation of modern software design.",
      content: "Object-Oriented Programming (OOP) is a programming paradigm that organises code around objects rather than functions. An object bundles together data (attributes) and behaviour (methods) into a single unit. OOP makes large codebases manageable by grouping related code, enabling code reuse through inheritance, and hiding internal complexity through encapsulation. Python is a fully object-oriented language — everything in Python is an object. The four pillars of OOP are: Encapsulation, Inheritance, Polymorphism, and Abstraction. Understanding OOP is essential for building real-world applications, using frameworks like Django, and contributing to open-source projects.",
      duration: 65, difficulty: "intermediate",
      sections: [
        "Classes and Objects — The Blueprint Concept||A class is a blueprint for creating objects. An object is an instance of a class with its own specific data.\n\nThink of it like this:\n- Class 'Car' = the blueprint (defines what all cars have)\n- Object 'my_car' = a specific car built from that blueprint\n\n```python\nclass Student:\n    def __init__(self, name, age, grade):\n        # __init__ is the constructor — runs when object is created\n        # self refers to the specific object being created\n        self.name = name      # attribute: stores the name\n        self.age = age        # attribute: stores the age\n        self.grade = grade    # attribute: stores the grade\n\n    def introduce(self):\n        # method: a function that belongs to the class\n        print(f'Hi, I am {self.name}, age {self.age}, grade {self.grade}.')\n\n    def study(self, subject):\n        print(f'{self.name} is studying {subject}.')\n\n\n# Creating objects (instances) from the class:\nkofi = Student('Kofi', 16, 'A')\namara = Student('Amara', 15, 'B')\n\n# Accessing attributes:\nprint(kofi.name)   # 'Kofi'\nprint(amara.age)   # 15\n\n# Calling methods:\nkofi.introduce()          # Hi, I am Kofi, age 16, grade A.\namara.study('Algebra')    # Amara is studying Algebra.\n```\n\nEach object has its OWN copy of the attributes. Changing kofi.grade does NOT affect amara.grade.",
        "Methods — Class Behaviour and String Representation||Methods are functions defined inside a class. The first parameter is always self (refers to the object itself).\n\nSpecial (dunder) methods: Python uses double-underscore methods (__init__, __str__, etc.) for special behaviours.\n\n```python\nclass BankAccount:\n    def __init__(self, owner, balance=0):\n        self.owner = owner\n        self.balance = balance\n        self.transactions = []\n\n    def deposit(self, amount):\n        if amount <= 0:\n            print('Deposit amount must be positive')\n            return\n        self.balance += amount\n        self.transactions.append(f'+{amount}')\n        print(f'Deposited {amount}. New balance: {self.balance}')\n\n    def withdraw(self, amount):\n        if amount > self.balance:\n            print('Insufficient funds!')\n            return\n        self.balance -= amount\n        self.transactions.append(f'-{amount}')\n        print(f'Withdrew {amount}. Remaining: {self.balance}')\n\n    def __str__(self):\n        # Called when you print the object\n        return f'BankAccount({self.owner}, balance={self.balance})'\n\n\naccount = BankAccount('Kofi', 1000)\naccount.deposit(500)     # Deposited 500. New balance: 1500\naccount.withdraw(200)    # Withdrew 200. Remaining: 1300\nprint(account)           # BankAccount(Kofi, balance=1300)\nprint(account.transactions)  # ['+500', '-200']\n```",
        "Inheritance — Reusing and Extending Classes||Inheritance allows a child class to inherit attributes and methods from a parent class, then add or override them.\n\n```python\nclass Animal:\n    def __init__(self, name, species):\n        self.name = name\n        self.species = species\n\n    def speak(self):\n        print(f'{self.name} makes a sound')\n\n    def __str__(self):\n        return f'{self.name} ({self.species})'\n\n\nclass Dog(Animal):     # Dog INHERITS from Animal\n    def __init__(self, name, breed):\n        super().__init__(name, 'Canis lupus familiaris')  # call parent __init__\n        self.breed = breed\n\n    def speak(self):   # OVERRIDE the parent method\n        print(f'{self.name} says: Woof!')\n\n    def fetch(self, item):\n        print(f'{self.name} fetches the {item}!')\n\n\nclass Cat(Animal):\n    def speak(self):\n        print(f'{self.name} says: Meow!')\n\n\ndog = Dog('Rex', 'German Shepherd')\ncat = Cat('Whiskers', 'Felis catus')\n\ndog.speak()      # Rex says: Woof!\ncat.speak()      # Whiskers says: Meow!\ndog.fetch('ball')  # Rex fetches the ball!\nprint(dog)       # Rex (Canis lupus familiaris)\n\n# isinstance() checks if an object is of a certain class or its subclass:\nprint(isinstance(dog, Dog))     # True\nprint(isinstance(dog, Animal))  # True (Dog inherits from Animal)\n```\n\nPolymorphism: different classes can have methods with the same name, and Python calls the right one:\n```python\nanimals = [Dog('Rex', 'Lab'), Cat('Luna', 'Felis catus')]\nfor animal in animals:\n    animal.speak()   # each calls its OWN speak() method\n```",
        "OOP Design Practice — Student Grade Book||Build a complete mini-application using OOP:\n\n```python\nclass Course:\n    def __init__(self, name, tutor):\n        self.name = name\n        self.tutor = tutor\n        self.students = []      # list of Student objects\n\n    def enroll(self, student):\n        self.students.append(student)\n        print(f'{student.name} enrolled in {self.name}')\n\n    def average_score(self):\n        if not self.students:\n            return 0\n        total = sum(s.score for s in self.students)\n        return total / len(self.students)\n\n    def top_student(self):\n        return max(self.students, key=lambda s: s.score)\n\n    def __str__(self):\n        return f'Course: {self.name} | Tutor: {self.tutor} | Students: {len(self.students)}'\n\n\nclass Student:\n    def __init__(self, name, score):\n        self.name = name\n        self.score = score\n\n    def grade(self):\n        if self.score >= 90: return 'A'\n        elif self.score >= 80: return 'B'\n        elif self.score >= 70: return 'C'\n        else: return 'F'\n\n    def __str__(self):\n        return f'{self.name}: {self.score} ({self.grade()})'\n\n\n# Using the classes\nalgebra = Course('Algebra', 'James Owusu')\nalgebra.enroll(Student('Kofi', 95))\nalgebra.enroll(Student('Amara', 82))\nalgebra.enroll(Student('Nia', 74))\n\nprint(algebra)\nprint(f'Class average: {algebra.average_score():.1f}')\nprint(f'Top student: {algebra.top_student()}')\nfor s in algebra.students:\n    print(' -', s)\n```\n\nOOP is used everywhere in professional Python: web frameworks (Django models are classes), data science (pandas DataFrame is a class), GUI apps (buttons/windows are objects).",
      ],
    },
    // ── Python: File Handling and Exceptions ─────────────────────────────────
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "File Handling and Exception Management",
      description: "Read and write files, and handle errors gracefully using try/except blocks.",
      content: "File handling allows Python programs to persist data beyond a single run — reading from and writing to files is fundamental to real-world applications. Exception handling (try/except) makes your programs robust by catching and responding to errors instead of crashing. Together, file I/O and exception handling are what separate beginner scripts from production-grade programs. You will use these skills every time you process CSV data, write log files, read configuration files, or interact with any external data source.",
      duration: 50, difficulty: "intermediate",
      sections: [
        "Reading Files — open(), read(), readlines())||Python's built-in open() function opens a file. Always use the with statement — it automatically closes the file when done:\n\n```python\n# Reading entire file as one string\nwith open('notes.txt', 'r') as file:\n    content = file.read()\n    print(content)\n\n# Reading line by line into a list\nwith open('students.txt', 'r') as file:\n    lines = file.readlines()   # ['Kofi\\n', 'Amara\\n', 'James\\n']\n    for line in lines:\n        print(line.strip())    # .strip() removes \\n whitespace\n\n# Reading line by line (memory efficient for large files)\nwith open('big_file.txt', 'r') as file:\n    for line in file:          # file object is iterable\n        print(line.strip())\n```\n\nFile modes:\n'r'  — read (default, file must exist)\n'w'  — write (creates new or OVERWRITES existing)\n'a'  — append (adds to end of existing file)\n'r+' — read and write\n\nEncoding: Always specify encoding for text files:\nopen('file.txt', 'r', encoding='utf-8')",
        "Writing Files — Creating and Appending Data||Writing to a file:\n\n```python\n# Write mode: creates file or OVERWRITES existing content\nwith open('report.txt', 'w') as file:\n    file.write('Student Report\\n')\n    file.write('=' * 30 + '\\n')\n    file.write('Kofi Mensah: 95/100\\n')\n    file.write('Amara Diallo: 82/100\\n')\n\n# Append mode: adds to end without overwriting\nwith open('report.txt', 'a') as file:\n    file.write('James Owusu: 91/100\\n')\n\n# Writing multiple lines with writelines()\nstudents = ['Alice\\n', 'Bob\\n', 'Carol\\n']\nwith open('names.txt', 'w') as file:\n    file.writelines(students)\n```\n\nWorking with CSV files (spreadsheet-like data):\n```python\nimport csv\n\n# Writing CSV\ndata = [\n    ['Name', 'Score', 'Grade'],\n    ['Kofi', 95, 'A'],\n    ['Amara', 82, 'B'],\n]\nwith open('grades.csv', 'w', newline='') as file:\n    writer = csv.writer(file)\n    writer.writerows(data)\n\n# Reading CSV\nwith open('grades.csv', 'r') as file:\n    reader = csv.reader(file)\n    for row in reader:\n        print(row)  # ['Kofi', '95', 'A']\n```",
        "Exception Handling — try / except / finally||An exception is an error that happens while the program is running. Without handling, the program crashes. With try/except, you catch the error and respond gracefully:\n\n```python\n# Basic try/except\ntry:\n    number = int(input('Enter a number: '))\n    result = 100 / number\n    print('Result:', result)\nexcept ValueError:\n    print('Error: Please enter a valid number!')\nexcept ZeroDivisionError:\n    print('Error: Cannot divide by zero!')\n\n# Catching any exception\ntry:\n    risky_operation()\nexcept Exception as e:\n    print(f'Something went wrong: {e}')\n\n# finally — always runs whether exception occurred or not\ntry:\n    file = open('data.txt', 'r')\n    data = file.read()\nexcept FileNotFoundError:\n    print('File not found!')\nfinally:\n    print('This always runs — good for cleanup')\n\n# else — runs only if NO exception occurred\ntry:\n    result = int('42')\nexcept ValueError:\n    print('Conversion failed')\nelse:\n    print('Success! Result:', result)  # runs because no exception\n```\n\nCommon exception types:\nValueError         — wrong value type (e.g., int('abc'))\nTypeError          — wrong data type (e.g., '5' + 5)\nZeroDivisionError  — dividing by zero\nFileNotFoundError  — file does not exist\nIndexError         — list index out of range\nKeyError           — dictionary key not found\nNameError          — variable not defined",
        "Practical Project — Student Grade File Manager||Combining files + exceptions in a real project:\n\n```python\nimport json\n\ndef save_students(students, filename='students.json'):\n    '''Save student list to a JSON file.'''\n    try:\n        with open(filename, 'w') as f:\n            json.dump(students, f, indent=2)\n        print(f'Saved {len(students)} students to {filename}')\n    except IOError as e:\n        print(f'Error saving file: {e}')\n\ndef load_students(filename='students.json'):\n    '''Load students from JSON file. Returns empty list if file not found.'''\n    try:\n        with open(filename, 'r') as f:\n            return json.load(f)\n    except FileNotFoundError:\n        print('No existing data found. Starting fresh.')\n        return []\n    except json.JSONDecodeError:\n        print('File is corrupted. Starting fresh.')\n        return []\n\ndef add_student(students, name, score):\n    students.append({'name': name, 'score': score})\n    print(f'Added {name} with score {score}')\n\n# Main program\nstudents = load_students()\nadd_student(students, 'Kofi', 95)\nadd_student(students, 'Amara', 82)\nsave_students(students)\n\n# View all students\nfor s in students:\n    grade = 'A' if s['score'] >= 90 else 'B' if s['score'] >= 80 else 'C'\n    print(f\"{s['name']}: {s['score']} ({grade})\")\n```\n\nJSON (JavaScript Object Notation) is the most common data exchange format. Python's json module converts between Python dicts/lists and JSON text, making it ideal for saving structured data.",
      ],
    },
    // ── Algebra: Solving Two-Step Equations ──────────────────────────────────
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Solving Two-Step Equations",
      description: "Master solving equations that require two inverse operations, including equations with fractions and negatives.",
      content: "A two-step equation requires exactly two operations to isolate the variable. The strategy is always the same: use inverse (opposite) operations in reverse order to PEMDAS. First undo addition or subtraction, then undo multiplication or division. The Golden Rule of equations: whatever you do to one side of the equation, you MUST do to the other side to keep it balanced. Two-step equations are the building blocks for solving all more complex algebraic equations and appear constantly in real-world problem solving — calculating costs, distances, time, and more.",
      duration: 45, difficulty: "beginner",
      sections: [
        "The Balance Model — Golden Rule of Equations||An equation is like a perfectly balanced scale. The equals sign (=) is the center. Whatever you do to one side, you MUST do to the other side.\n\nInverse operations:\n- Addition and subtraction are inverses of each other\n- Multiplication and division are inverses of each other\n\nStrategy for two-step equations:\nStep 1: Undo the addition or subtraction first\nStep 2: Undo the multiplication or division second\n\nWhy undo addition/subtraction first?\nBecause we work in REVERSE order of PEMDAS.\nIn PEMDAS: × ÷ before + −\nIn solving: undo + − before × ÷\n\nExample: 2x + 5 = 13\nStep 1: Subtract 5 from both sides → 2x + 5 - 5 = 13 - 5 → 2x = 8\nStep 2: Divide both sides by 2 → 2x/2 = 8/2 → x = 4\nCheck: 2(4) + 5 = 8 + 5 = 13 ✓\n\nALWAYS check your answer by substituting back into the original equation!",
        "Solving Two-Step Equations — Worked Examples||Example 1: 3x + 7 = 22\nStep 1: Subtract 7 → 3x = 15\nStep 2: Divide by 3 → x = 5\nCheck: 3(5) + 7 = 15 + 7 = 22 ✓\n\nExample 2: 5x - 3 = 17\nStep 1: Add 3 to both sides → 5x = 20\nStep 2: Divide by 5 → x = 4\nCheck: 5(4) - 3 = 20 - 3 = 17 ✓\n\nExample 3: x/4 + 2 = 9\nStep 1: Subtract 2 → x/4 = 7\nStep 2: Multiply by 4 → x = 28\nCheck: 28/4 + 2 = 7 + 2 = 9 ✓\n\nExample 4: -3x + 10 = 1 (negative coefficient)\nStep 1: Subtract 10 → -3x = -9\nStep 2: Divide by -3 → x = 3\nCheck: -3(3) + 10 = -9 + 10 = 1 ✓\nNOTE: Dividing both sides by a NEGATIVE number — the equation stays balanced!\n\nExample 5: x/(-2) - 5 = -8\nStep 1: Add 5 → x/(-2) = -3\nStep 2: Multiply by -2 → x = 6\nCheck: 6/(-2) - 5 = -3 - 5 = -8 ✓\n\nPractice set:\n1. 4x + 3 = 19       [x = 4]\n2. 6x - 7 = 11       [x = 3]\n3. x/3 + 4 = 10      [x = 18]\n4. -2x + 9 = 3       [x = 3]",
        "Equations with Like Terms and Distribution||Sometimes you must simplify BEFORE solving by combining like terms or distributing.\n\nCombining like terms first:\n5x + 3x - 4 = 20\n8x - 4 = 20         (combine: 5x + 3x = 8x)\n8x = 24             (add 4 to both sides)\nx = 3               (divide by 8)\nCheck: 5(3) + 3(3) - 4 = 15 + 9 - 4 = 20 ✓\n\nDistribute first:\n2(x + 4) = 18\n2x + 8 = 18         (distribute: 2×x + 2×4)\n2x = 10             (subtract 8)\nx = 5               (divide by 2)\nCheck: 2(5 + 4) = 2(9) = 18 ✓\n\n3(2x - 1) = 15\n6x - 3 = 15         (distribute)\n6x = 18             (add 3)\nx = 3               (divide by 6)\nCheck: 3(2×3 - 1) = 3(5) = 15 ✓\n\nVariables on BOTH sides — move them to one side:\n5x + 2 = 3x + 10\n5x - 3x + 2 = 10    (subtract 3x from both sides)\n2x + 2 = 10\n2x = 8\nx = 4\nCheck: 5(4)+2=22, 3(4)+10=22 ✓\n\nPractice:\n1. 4(x + 2) = 28             [x = 5]\n2. 3x + 5 = x + 11          [x = 3]\n3. 2(3x - 4) = 16            [x = 4]",
        "Real-World Equation Word Problems||The true power of algebra is solving real problems by translating words into equations.\n\nProblem-solving steps:\n1. Read carefully — what is unknown? (assign a variable)\n2. Write an equation from the problem description\n3. Solve the equation\n4. Check: does your answer make sense in context?\n\nExample 1 — Cost problem:\nA taxi charges a $3 base fee plus $2 per kilometre. Kofi's ride cost $15. How many km did he travel?\nLet k = number of kilometres\nEquation: 3 + 2k = 15\n2k = 12\nk = 6\nAnswer: 6 kilometres\nCheck: 3 + 2(6) = 3 + 12 = 15 ✓\n\nExample 2 — Age problem:\nAmara is 3 years older than twice her sister Nia's age. Amara is 19. How old is Nia?\nLet n = Nia's age\nEquation: 2n + 3 = 19\n2n = 16\nn = 8\nAnswer: Nia is 8 years old.\nCheck: 2(8) + 3 = 16 + 3 = 19 ✓\n\nExample 3 — Geometry:\nA rectangle's length is 5 more than twice its width. The perimeter is 34 cm. Find the width.\nLet w = width, then length = 2w + 5\nPerimeter = 2(length + width) = 34\n2(2w + 5 + w) = 34\n2(3w + 5) = 34\n6w + 10 = 34\n6w = 24\nw = 4\nAnswer: width = 4 cm, length = 2(4)+5 = 13 cm\nCheck: 2(4+13) = 2(17) = 34 ✓\n\nWord problem keywords:\n'is' → = (equals)\n'more than / increased by' → + (add)\n'less than / decreased by' → - (subtract)\n'times / product of' → × (multiply)\n'divided equally' → ÷ (divide)\n'twice' → 2x | 'triple' → 3x",
      ],
    },
    // ── Algebra: Inequalities and the Number Line ─────────────────────────────
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Inequalities and the Number Line",
      description: "Solve algebraic inequalities, graph solutions on a number line, and interpret compound inequalities.",
      content: "An inequality is a mathematical statement that two expressions are NOT equal — one is greater than, less than, or equal to the other. Inequalities describe ranges of values rather than single solutions, making them essential for real-world constraints: minimum age requirements, maximum weight limits, budgets, and speed limits are all inequalities. The techniques for solving inequalities are almost identical to solving equations, with one critical exception: when you multiply or divide by a NEGATIVE number, you must FLIP the inequality sign.",
      duration: 40, difficulty: "beginner",
      sections: [
        "Inequality Symbols and the Number Line||The four inequality symbols:\n< less than: x < 5 means x is any number strictly below 5\n> greater than: x > 3 means x is any number strictly above 3\n≤ less than OR equal to: x ≤ 7 means x can be 7 or any number below\n≥ greater than OR equal to: x ≥ 0 means x can be 0 or any positive number\n\nGraphing on a number line:\n- Open circle ○ = the endpoint is NOT included (use with < or >)\n- Closed circle ● = the endpoint IS included (use with ≤ or ≥)\n- Draw an arrow in the direction of valid values\n\nExamples of graphs:\nx > 3:  draw open circle at 3, arrow pointing RIGHT →\nx ≤ -1: draw closed circle at -1, arrow pointing LEFT ←\nx ≥ 0:  draw closed circle at 0, arrow pointing RIGHT →\n\nInterval notation (used in higher math):\nx < 5     → (-∞, 5)\nx ≥ 2     → [2, +∞)\n1 < x ≤ 6 → (1, 6]\n\nReal-world examples of inequalities:\n- You must be at least 18 to vote: age ≥ 18\n- Speed limit is 60 km/h: speed ≤ 60\n- A bag weighs more than 5 kg: weight > 5\n- Temperature is below freezing: temp < 0",
        "Solving One and Two-Step Inequalities||Solving inequalities uses the SAME steps as equations, with ONE important exception.\n\nSolving one-step inequalities:\nx + 4 > 9\nx > 5          (subtract 4 from both sides)\nGraph: open circle at 5, arrow right\n\nx - 3 ≤ 8\nx ≤ 11         (add 3 to both sides)\nGraph: closed circle at 11, arrow left\n\n3x < 18\nx < 6          (divide both sides by 3, positive — sign stays the same)\n\n⚠️ CRITICAL RULE — Multiplying/Dividing by a NEGATIVE number:\nWhen you multiply or divide BOTH sides by a NEGATIVE number, FLIP the inequality sign!\n\n-2x > 10\nx < -5         (divide by -2 AND flip > to <)\nCheck with x = -6: -2(-6) = 12 > 10 ✓\n\n-x/3 ≤ 4\nx ≥ -12        (multiply by -3 AND flip ≤ to ≥)\n\nTwo-step inequalities:\n2x + 3 > 11\n2x > 8         (subtract 3)\nx > 4          (divide by 2 — positive, no flip)\n\n-3x + 7 ≥ 16\n-3x ≥ 9        (subtract 7)\nx ≤ -3         (divide by -3 — FLIP ≥ to ≤)\n\nPractice:\n1. 4x - 5 > 11      [x > 4]\n2. -2x + 8 ≤ 2      [x ≥ 3]\n3. 3x + 1 < -8      [x < -3]",
        "Compound Inequalities — AND and OR||A compound inequality combines two inequalities.\n\nAND compound inequality (both must be satisfied simultaneously):\nWritten as: a < x < b  (x is between a and b)\n\nExample: -2 < x ≤ 5\nMeans: x is greater than -2 AND less than or equal to 5\nGraph: open circle at -2, closed circle at 5, line connecting them\nSolution: all numbers between -2 and 5, including 5 but not -2\n\nSolving compound AND inequalities:\n-1 ≤ 2x + 3 < 9\n-4 ≤ 2x < 6       (subtract 3 from all three parts)\n-2 ≤ x < 3         (divide all three parts by 2)\nGraph: closed circle at -2, open circle at 3, connected\n\nOR compound inequality (at least ONE must be satisfied):\nx < -3 OR x > 4\nGraph: two separate arrows pointing outward from -3 and 4\n\nSolving compound OR inequalities:\n2x + 1 < -5  OR  3x - 2 > 10\n2x < -6       OR  3x > 12\nx < -3        OR  x > 4\n\nReal-world compound inequality:\nA student needs a score between 70 and 90 (inclusive) for grade B:\n70 ≤ score ≤ 90\n\nA theme park charges child price for ages under 12 or senior price for 65 and over:\nage < 12 OR age ≥ 65",
        "Inequality Word Problems and Applications||Translating word problems into inequalities:\n\nKeywords:\n'at least' → ≥ (minimum value, can equal)\n'at most' → ≤ (maximum value, can equal)\n'more than' → > (strictly greater, cannot equal)\n'fewer than' / 'less than' → < (strictly less, cannot equal)\n'between' → compound AND inequality\n\nExample 1 — Budget problem:\nKofi has $50 to spend on books. Each book costs $8. How many books can he buy?\nLet b = number of books\nInequality: 8b ≤ 50\nb ≤ 6.25\nSince books are whole numbers: b ≤ 6\nAnswer: Kofi can buy at most 6 books.\n\nExample 2 — Minimum score problem:\nA student needs an average of at least 80 to pass. After 3 tests scoring 75, 85, and 78, what must she score on the 4th test?\nLet s = score on 4th test\nInequality: (75 + 85 + 78 + s) / 4 ≥ 80\n(238 + s) / 4 ≥ 80\n238 + s ≥ 320\ns ≥ 82\nAnswer: She must score at least 82 on the 4th test.\n\nExample 3 — Speed and distance:\nA driver must travel more than 120 km but no more than 200 km. Write and interpret the inequality.\n120 < distance ≤ 200\nThe driver travels strictly more than 120 km and at most 200 km.\n\nPractice:\n1. You need at least 15 volunteers for an event. You have 9. How many more do you need? [n ≥ 6]\n2. A box can hold at most 25 kg. It already has 17 kg. How much more can be added? [w ≤ 8]",
      ],
    },
    // ── Algebra: Introduction to Polynomials ──────────────────────────────────
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Introduction to Polynomials and Factoring",
      description: "Understand polynomial expressions, learn to add, subtract, and multiply polynomials, and factor common expressions.",
      content: "A polynomial is an algebraic expression made of one or more terms, where each term has a variable raised to a non-negative integer exponent. Polynomials appear everywhere in mathematics, physics, economics, and computer graphics. They are used to model curved paths, calculate areas of complex shapes, and describe how quantities grow or change. Factoring is the process of breaking a polynomial down into simpler expressions multiplied together — it is one of the most important skills in algebra and is essential for solving quadratic equations, simplifying rational expressions, and understanding calculus.",
      duration: 50, difficulty: "intermediate",
      sections: [
        "Polynomials — Terms, Degree, and Classification||A polynomial is an expression with one or more terms of the form axⁿ (where a is a coefficient and n is a non-negative integer exponent).\n\nTypes of polynomials:\nMonomial   — 1 term:    5x²,  -3y,  7\nBinomial   — 2 terms:   x + 4,  3x² - 2\nTrinomial  — 3 terms:   x² + 5x + 6,  2x² - x + 8\nPolynomial — 4+ terms:  x³ + 2x² - x + 5\n\nDegree of a polynomial = the highest exponent of the variable:\n7x⁴ - 3x² + x - 2   → degree 4\n5x³ + 2x             → degree 3\n4x + 9               → degree 1 (linear)\n6                    → degree 0 (constant)\n\nStandard form: write terms in DESCENDING order of exponent:\nNot standard: 3x + 2x³ - 5x²\nStandard form: 2x³ - 5x² + 3x\n\nLeading coefficient: the coefficient of the highest-degree term.\nIn 2x³ - 5x² + 3x: leading coefficient = 2\n\nNaming by degree:\ndegree 1 = linear\ndegree 2 = quadratic\ndegree 3 = cubic\ndegree 4 = quartic",
        "Adding and Subtracting Polynomials||To add or subtract polynomials, combine LIKE TERMS (same variable and same exponent).\n\nAdding polynomials:\n(3x² + 5x - 2) + (x² - 3x + 7)\nGroup like terms: (3x² + x²) + (5x - 3x) + (-2 + 7)\nSimplify: 4x² + 2x + 5\n\nMore examples:\n(4x³ - 2x + 1) + (x³ + 5x² + 3x - 4)\n= (4x³ + x³) + (5x²) + (-2x + 3x) + (1 - 4)\n= 5x³ + 5x² + x - 3\n\nSubtracting polynomials — DISTRIBUTE the negative sign to every term:\n(5x² + 3x - 1) - (2x² - x + 4)\n= 5x² + 3x - 1 - 2x² + x - 4    (distribute the -)\n= (5x² - 2x²) + (3x + x) + (-1 - 4)\n= 3x² + 4x - 5\n\nCommon mistake: forgetting to distribute the negative to ALL terms in the second polynomial!\n\nAnother example:\n(7x² - 4x + 2) - (3x² + 2x - 5)\n= 7x² - 4x + 2 - 3x² - 2x + 5    (distribute -1 to each term)\n= (7x²-3x²) + (-4x-2x) + (2+5)\n= 4x² - 6x + 7\n\nPractice:\n1. (2x² + 3x - 1) + (x² - x + 4)          [3x² + 2x + 3]\n2. (5x² - 2x + 7) - (3x² + x - 2)          [2x² - 3x + 9]\n3. (x³ + 4x - 3) + (2x³ - x² + x + 5)     [3x³ - x² + 5x + 2]",
        "Multiplying Polynomials — FOIL and Distribution||Multiplying a monomial by a polynomial — distribute to every term:\n3x(2x² - 4x + 5) = 6x³ - 12x² + 15x\n-2x(x + 3) = -2x² - 6x\n\nMultiplying two binomials — use FOIL:\nFOIL stands for: First, Outer, Inner, Last\n\n(x + 3)(x + 5)\nFirst: x × x = x²\nOuter: x × 5 = 5x\nInner: 3 × x = 3x\nLast:  3 × 5 = 15\nResult: x² + 5x + 3x + 15 = x² + 8x + 15\n\n(2x - 1)(x + 4)\nFirst: 2x × x = 2x²\nOuter: 2x × 4 = 8x\nInner: -1 × x = -x\nLast:  -1 × 4 = -4\nResult: 2x² + 8x - x - 4 = 2x² + 7x - 4\n\nSpecial products (memorise these!):\n(a + b)² = a² + 2ab + b²   → Perfect square trinomial\n(a - b)² = a² - 2ab + b²   → Perfect square trinomial\n(a + b)(a - b) = a² - b²   → Difference of squares\n\nExamples:\n(x + 4)² = x² + 8x + 16\n(x - 3)² = x² - 6x + 9\n(x + 5)(x - 5) = x² - 25",
        "Factoring Polynomials — GCF and Trinomials||Factoring is the reverse of multiplying — we split a polynomial into factors.\n\nStep 1 — Always check for Greatest Common Factor (GCF) first:\n6x² + 9x = 3x(2x + 3)        GCF is 3x\n12x³ - 8x² + 4x = 4x(3x² - 2x + 1)  GCF is 4x\n\nStep 2 — Factoring trinomials: x² + bx + c = (x + p)(x + q)\nFind p and q such that: p × q = c AND p + q = b\n\nExample: x² + 7x + 12\nNeed: p × q = 12 AND p + q = 7\nPairs that multiply to 12: (1,12), (2,6), (3,4)\nWhich pair sums to 7? → 3 and 4\nAnswer: (x + 3)(x + 4)\nVerify with FOIL: x² + 4x + 3x + 12 = x² + 7x + 12 ✓\n\nExample: x² - 5x + 6\nNeed: p × q = 6 AND p + q = -5\nPairs: (-1,-6), (-2,-3)\n(-2) × (-3) = 6 and (-2) + (-3) = -5 ✓\nAnswer: (x - 2)(x - 3)\n\nExample: x² + 2x - 15\nNeed: p × q = -15 AND p + q = 2\nPairs: (5,-3), (-5,3), (15,-1)\n5 × (-3) = -15 and 5 + (-3) = 2 ✓\nAnswer: (x + 5)(x - 3)\n\nFactoring difference of squares: a² - b² = (a+b)(a-b)\nx² - 25 = (x+5)(x-5)\n4x² - 9 = (2x+3)(2x-3)\n\nPractice:\n1. x² + 9x + 20         [(x+4)(x+5)]\n2. x² - 3x - 18         [(x-6)(x+3)]\n3. x² - 16              [(x+4)(x-4)]",
      ],
    },
    // ── Emotional Intelligence — 6 more lessons ──────────────────────────────
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Self-Regulation: Managing Difficult Emotions",
      description: "Learn practical techniques to manage anger, anxiety, and overwhelm without suppressing your feelings.",
      content: "Self-regulation is the ability to manage your emotional responses in a healthy, constructive way. It does NOT mean suppressing or ignoring emotions — it means choosing how to respond rather than reacting impulsively. People with strong self-regulation recover quickly from setbacks, make better decisions under pressure, and maintain healthier relationships. Research shows that self-regulation is one of the strongest predictors of academic achievement, career success, and life satisfaction. The good news: self-regulation is a skill, not a personality trait — it can be learned and strengthened with consistent practice.",
      duration: 40, difficulty: "beginner",
      sections: [
        "What is Self-Regulation?||Self-regulation = the ability to pause between a feeling and a reaction, and choose a healthy response.\n\nThe Emotion-Regulation Cycle:\n1. Something happens (trigger event)\n2. You feel an emotion (automatic)\n3. You notice the feeling (awareness)\n4. You choose a response (regulation)\n5. You act (behaviour)\n\nWithout regulation: trigger → immediate reaction (impulsive)\nWith regulation:    trigger → pause → chosen response (intentional)\n\nWhy it matters:\n- Students with good self-regulation get better grades\n- They have fewer conflicts with peers and teachers\n- They handle exam stress more effectively\n- They build stronger, more trusting friendships\n\nSelf-regulation is NOT:\n❌ Suppressing emotions (pretending you're fine when you're not)\n❌ Avoiding situations that make you feel\n❌ Always being calm (even regulated people feel strongly!)\n\nSelf-regulation IS:\n✅ Noticing what you feel\n✅ Understanding why you feel it\n✅ Choosing a healthy response",
        "The STOP Technique||When you notice a strong emotion rising, use STOP:\n\nS — Stop what you're doing\nT — Take a deep breath\nO — Observe what you're feeling and thinking\nP — Proceed with awareness\n\nThis 10-second pause interrupts the automatic reaction cycle and gives your rational brain time to catch up.\n\nDeep Breathing — the fastest self-regulation tool:\nThe 4-7-8 breath:\n- Inhale through your nose for 4 counts\n- Hold for 7 counts\n- Exhale slowly through your mouth for 8 counts\n- Repeat 3-4 times\n\nWhy it works: slow exhaling activates the parasympathetic nervous system (the 'rest and digest' mode), which physically slows your heart rate and reduces the stress hormone cortisol.\n\nBox Breathing (used by military and athletes):\n- Inhale for 4 counts\n- Hold for 4 counts\n- Exhale for 4 counts\n- Hold for 4 counts\n- Repeat 4 times\n\nPractice STOP right now: Think of something mildly annoying. Apply the STOP steps. Notice how your body feels before and after the breath.",
        "Reframing — Changing How You Think About a Situation||Cognitive reframing means looking at a situation from a different, more balanced perspective. It does NOT mean thinking positively — it means thinking accurately.\n\nUnhelpful thought: 'I failed the test. I'm stupid and I'll never pass.'\nReframed thought: 'I failed this test. That's disappointing. What can I learn from it and do differently next time?'\n\nCommon unhelpful thinking patterns:\n- Catastrophising: 'This is the worst thing ever'\n- All-or-nothing: 'I got one thing wrong so I'm a complete failure'\n- Mind-reading: 'They didn't reply — they must hate me'\n- Personalising: 'They're in a bad mood — it must be my fault'\n\nReframing questions to ask yourself:\n1. Is this thought definitely true? What evidence do I have?\n2. What would I say to a friend who thought this?\n3. Will this matter in 5 years?\n4. What is one more realistic way to see this?\n5. What can I learn or do here?\n\nReframing practice:\nSituation: Your group project partner didn't do their share of the work.\n\n❌ Catastrophising: 'Everything is ruined. This always happens to me.'\n✅ Reframe: 'This is frustrating. I'll speak to them directly about it, and if needed, let the teacher know. I can control my own part of the work.'\n\nReframing reduces emotional intensity and opens up problem-solving.",
        "Healthy Outlets for Strong Emotions||Some emotions are too intense for breathing alone. Healthy outlets help discharge the energy safely.\n\nPhysical outlets (releases tension from the body):\n- Exercise: walking, running, dancing, sport — releases endorphins\n- Progressive muscle relaxation: tense each muscle group for 5 seconds then release, from feet to face\n- Shaking: literally shake your hands, arms, whole body for 30 seconds (used in trauma therapy)\n\nCreative outlets (express what words can't):\n- Journaling: write about what happened, what you felt, what you need\n- Art: drawing, painting, or even doodling when stressed\n- Music: listen to or play music that matches or shifts your mood\n\nSocial outlets (connection regulates emotions):\n- Talk to someone you trust\n- Ask for a hug or physical presence (with consent)\n- Even being near a calm person can calm you (co-regulation)\n\nCooling-down strategies:\n- Splash cold water on your face\n- Step outside and look at the horizon\n- 5-4-3-2-1 grounding: name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste\n\nThe key: the outlet must be HEALTHY — it should release emotion without harming you or others.\n\nUnhealthy outlets to avoid: shouting at people, slamming objects, scrolling social media (increases anxiety), substance use.",
      ],
    },
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Motivation, Resilience, and a Growth Mindset",
      description: "Discover what truly drives you, how to stay motivated through difficulty, and how resilience can be built like a muscle.",
      content: "Motivation is the force that moves you towards your goals. Resilience is the ability to bounce back from setbacks, failure, and adversity. Together with a growth mindset — the belief that abilities can be developed through effort — these three qualities form the emotional foundation of achievement. Research by psychologist Carol Dweck (Stanford) showed that students with a growth mindset consistently outperform those with a fixed mindset, even when starting from the same ability level. Motivation and resilience are not personality traits you either have or don't — they are skills that can be cultivated deliberately.",
      duration: 45, difficulty: "beginner",
      sections: [
        "Intrinsic vs Extrinsic Motivation||Extrinsic motivation: driven by external rewards or punishments.\nExamples: studying for grades, working for money, helping to avoid criticism.\nIt works short-term but fades when the reward disappears.\n\nIntrinsic motivation: driven by internal satisfaction, curiosity, or meaning.\nExamples: learning because it's interesting, helping because it feels good, creating because you enjoy it.\nIt is more powerful and sustainable long-term.\n\nSelf-Determination Theory (Deci & Ryan) says intrinsic motivation thrives when three needs are met:\n1. Autonomy — feeling you have a choice in what you do\n2. Competence — feeling you are growing and improving\n3. Relatedness — feeling connected to others who care about you\n\nHow to boost intrinsic motivation:\n- Find the WHY behind what you're learning ('This helps me towards my goal of...')\n- Set your own small goals within larger required tasks\n- Celebrate progress, not just achievement\n- Connect your work to your values and identity\n\nReflection: Write down 3 things you genuinely enjoy doing. Why do you enjoy them? What does that tell you about your values?",
        "Growth Mindset vs Fixed Mindset||Fixed mindset (Carol Dweck): 'My abilities are fixed. I'm either smart or I'm not.'\n→ Avoids challenges (to avoid looking stupid)\n→ Gives up when things get hard\n→ Sees effort as pointless ('If I were smart I wouldn't need to try')\n→ Threatened by others' success\n\nGrowth mindset: 'My abilities can develop with effort and learning.'\n→ Embraces challenges as opportunities to grow\n→ Persists through difficulty\n→ Sees effort as the path to mastery\n→ Inspired by others' success ('What can I learn from them?')\n\nThe POWER of 'yet':\nFixed: 'I can't do algebra.'\nGrowth: 'I can't do algebra YET.'\n\nOne word changes the entire meaning — from permanent limitation to temporary state.\n\nChanging fixed to growth self-talk:\n❌ 'I'm terrible at maths' → ✅ 'I'm still learning maths and I'm getting better'\n❌ 'I failed — I'm hopeless' → ✅ 'I failed this time. What can I do differently?'\n❌ 'She's just naturally smart' → ✅ 'She's worked hard at this. What can I learn from her approach?'\n\nNeuroscience fact: Every time you try something difficult and keep going, your brain physically forms new neural connections. The struggle IS the growth.",
        "Building Resilience — Bouncing Back Stronger||Resilience is NOT about being tough and never getting hurt. It is the ability to recover, adapt, and grow after difficulty.\n\nThe 3 Ps of unhelpful thinking after failure (Martin Seligman):\n- Permanence: 'This will last forever' → Resilient reframe: 'This is temporary'\n- Pervasiveness: 'This ruins everything' → Resilient reframe: 'This affects this one area'\n- Personalisation: 'This is all my fault' → Resilient reframe: 'What factors were in/out of my control?'\n\nThe Resilience Toolkit:\n1. Reframe the narrative — what can this teach you?\n2. Accept what you cannot control\n3. Take one small action you CAN control\n4. Lean on your support network\n5. Rest and self-care are not optional — they rebuild capacity\n6. Remember past resilience — 'I've gotten through hard things before'\n\nPost-Traumatic Growth: Research shows that many people report becoming stronger, having deeper relationships, and finding greater meaning AFTER significant adversity. Resilience doesn't just return you to where you were — it can move you further.\n\nResilience building practice — The Adversity Journal:\nAfter a difficult experience, write:\n1. What happened?\n2. What did I feel?\n3. What did I do well in response?\n4. What will I do differently next time?\n5. What does this experience teach me about myself?",
        "Goal Setting That Actually Works||Motivation stays alive when goals are clear, meaningful, and achievable.\n\nSMART Goals:\nS — Specific: 'I will practise algebra for 20 minutes every Tuesday and Thursday'\nM — Measurable: 'I will complete 5 practice problems per session'\nA — Achievable: challenging but realistic for your current level\nR — Relevant: connected to something you genuinely care about\nT — Time-bound: 'By the end of this month'\n\n❌ Vague goal: 'I want to be better at school'\n✅ SMART goal: 'I will score at least 75% on my next maths test by studying 30 minutes every day for the next 2 weeks'\n\nImplementation Intentions — the IF-THEN technique:\nResearch shows that adding IF-THEN details doubles goal achievement.\n'I will study' → low success\n'IF it is 5pm on a weekday, THEN I will sit at my desk and open my notebook for 20 minutes' → much higher success\n\nTracking progress:\n- Keep a simple checklist or habit tracker\n- Visual progress (filling in a chart) activates the brain's reward system\n- Review your goal weekly: Am I on track? Do I need to adjust?\n\nSelf-compassion when you miss a goal:\nMissing a goal once does NOT mean failure. The question is: can you recommit?\nResearch shows self-compassion after failure leads to MORE persistence, not less.",
      ],
    },
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Social Skills and Building Strong Relationships",
      description: "Learn the core social skills that help you form genuine connections, navigate friendships, and earn trust.",
      content: "Humans are wired for connection — relationships are fundamental to wellbeing, mental health, and success. Social skills are not about being the most popular person in the room. They are about building genuine, mutual, trusting connections. Research by Robert Waldinger from Harvard's 75-year study on adult development found that the single most important predictor of happiness and health in later life was the quality of personal relationships — not wealth, fame, or achievement. Social skills can be learned at any age, and emotional intelligence is the foundation that makes them authentic rather than manipulative.",
      duration: 40, difficulty: "beginner",
      sections: [
        "First Impressions and Approachability||First impressions form within 7 seconds and are hard to change — but they CAN be improved.\n\nKey elements of a positive first impression:\n1. Open body language: uncrossed arms, facing towards the person, relaxed posture\n2. Eye contact: natural, not staring — roughly 60-70% of the time\n3. Genuine smile: involves your eyes as well as your mouth (Duchenne smile)\n4. Name use: 'Nice to meet you, [name]' — people love hearing their own name\n5. Listening posture: slight lean forward, nod gently, don't look at your phone\n\nApproachability signals:\n- Smile when making eye contact with someone\n- Don't cross your arms or hunch\n- Put your phone away in social situations\n- Be the first to say hello\n\nConversation starters beyond 'fine':\n❌ 'How are you?' / 'Fine, you?'\n✅ 'What's been the best part of your week?'\n✅ 'I heard you're interested in [topic] — how did you get into that?'\n✅ Comment on something you both can observe: 'This lesson is intense! Are you finding it okay?'\n\nWarm vs cold body language:\nCold: crossed arms, looking away, one-word answers, checking phone\nWarm: open arms, leaning in, asking follow-up questions, full attention",
        "The Art of Genuine Conversation||Great conversations are 50/50 — both people feel heard, valued, and engaged.\n\nThe FORD method for keeping conversation flowing:\nF — Family: 'Do you have siblings? What are they like?'\nO — Occupation/school: 'What subjects do you enjoy most?'\nR — Recreation: 'What do you do for fun outside school?'\nD — Dreams: 'Is there something you really want to do or learn?'\n\nActive listening (review and deepen from Lesson 2):\n1. Give full, undivided attention\n2. Reflect back: 'So what you're saying is...'\n3. Ask a follow-up question about something they said\n4. Avoid hijacking: 'That reminds me of when I...' can shift focus back to you — use sparingly\n5. Validate emotions: 'That sounds really frustrating / exciting / hard'\n\nThe biggest conversation mistake: waiting for your turn to speak rather than truly listening.\nWhen you are really listening, you naturally have better follow-up questions.\n\nBuilding rapport through similarity:\nPeople like people who are similar to them. Naturally highlight shared interests, experiences, or opinions when genuine (never fake it).\n\nHumour: light, self-deprecating humour builds warmth. Avoid sarcasm until you know someone well.",
        "Healthy Boundaries — Protecting Yourself and Others||A boundary is a limit you set to protect your emotional, physical, or mental wellbeing. Boundaries are NOT selfish — they are necessary for healthy relationships.\n\nTypes of boundaries:\n- Emotional: 'I don't share certain personal details with people I've just met'\n- Physical: 'I'm not comfortable with hugs from people I don't know'\n- Time: 'I can help, but only for 30 minutes'\n- Digital: 'I don't check messages after 9pm'\n\nSetting a boundary — the 3-part statement:\n1. State the behaviour: 'When you speak to me that way...\n2. State how it makes you feel: '...I feel disrespected...'\n3. State what you need: '...I need you to speak to me calmly.'\n\nSaying no with kindness:\n'I appreciate you asking, but I'm not able to help with that right now.'\n'I can't do that, but I can do [alternative].'\n'I need to say no to this — I hope you understand.'\n\nYou do NOT need to justify, apologise excessively, or feel guilty for having limits.\n\nRespecting others' boundaries:\n- Accept 'no' without pressure\n- Don't share someone's personal information\n- Ask before giving advice: 'Do you want advice or do you just need to vent?'\n- Notice when someone seems uncomfortable and ease the pressure\n\nA boundary is not a wall — it is a gate you control.",
        "Trust, Loyalty, and Repairing Relationships||Trust is the foundation of every deep relationship. It is built slowly through consistent, reliable actions and can be broken quickly by one significant act.\n\nHow trust is built:\n- Reliability: doing what you say you will do\n- Honesty: telling the truth even when it's difficult\n- Confidentiality: keeping what people share in private\n- Consistency: behaving the same way regardless of who is watching\n- Vulnerability: sharing something genuine about yourself\n\nThe Trust Equation (Maister):\nTrust = (Credibility + Reliability + Intimacy) ÷ Self-Orientation\nSelf-Orientation = how much you focus on yourself vs the other person\nHigher self-orientation (always making it about you) = lower trust.\n\nHow trust is broken:\n- Betraying a confidence\n- Lying or exaggerating\n- Letting someone down repeatedly\n- Prioritising your own interests at the other person's expense\n\nRepairing a relationship after conflict:\n1. Take responsibility for your part (without blaming theirs)\n2. Apologise genuinely: name the specific action, acknowledge the impact\n3. Ask what the other person needs\n4. Give them time — don't rush the reconciliation\n5. Change your behaviour going forward\n\nThe anatomy of a real apology:\n❌ 'I'm sorry you feel that way' (not a real apology — blames their feelings)\n❌ 'I'm sorry, but you did...' (deflecting)\n✅ 'I'm sorry I said that. I can see it hurt you. I should have spoken more carefully. What do you need from me now?'",
      ],
    },
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Conflict Resolution",
      description: "Learn to navigate disagreements constructively, express your needs without aggression, and reach solutions that work for everyone.",
      content: "Conflict is a normal, unavoidable part of human relationships. The question is never how to avoid conflict — it is how to resolve it in a way that preserves the relationship and solves the problem. People with strong conflict resolution skills are better leaders, better friends, and better colleagues. Most conflicts escalate not because of the original issue but because of how people respond to each other during the disagreement. Learning to separate the person from the problem, express needs clearly, and listen during tension are the core skills of conflict resolution.",
      duration: 38, difficulty: "intermediate",
      sections: [
        "Why Conflicts Escalate — The Conflict Cycle||Most conflicts follow a predictable escalation pattern:\n\n1. Trigger event (something happens)\n2. Negative interpretation ('They did it on purpose')\n3. Emotional reaction (anger, hurt, fear)\n4. Reactive behaviour (shouting, withdrawing, attacking)\n5. Other person reacts defensively\n6. Escalation\n\nThe cycle can be interrupted at steps 2, 3, or 4.\n\nCommon causes of conflict:\n- Misunderstanding / miscommunication\n- Unmet needs or expectations\n- Perceived disrespect or unfairness\n- Competition for resources (time, attention, space)\n- Different values or priorities\n\nConflict styles (Thomas-Kilmann model):\n- Avoiding: neither person's needs are met (lose-lose)\n- Competing: one wins, one loses (win-lose)\n- Accommodating: you give in to keep peace (lose-win)\n- Compromising: both give a little (partial win-partial win)\n- Collaborating: both work to find a solution that meets both needs (win-win)\n\nThe goal of healthy conflict resolution is collaboration — finding a solution that genuinely addresses both parties' underlying needs.",
        "I-Messages vs You-Messages||The language you use during a conflict dramatically affects how the other person responds.\n\nYou-messages put the other person on the defensive:\n'You always ignore me.'\n'You never think about how I feel.'\n'You ruined everything.'\n\nI-messages express your experience without blaming:\nFormula: 'I feel [emotion] when [specific behaviour] because [impact on me]. I need [what you need].'\n\nExamples:\n❌ 'You never listen when I talk!'\n✅ 'I feel frustrated when I'm interrupted mid-sentence because I feel like what I'm saying doesn't matter. I need to be able to finish my thought.'\n\n❌ 'You're always late — you're so selfish!'\n✅ 'I feel anxious and disrespected when you arrive late because I had to wait 30 minutes not knowing what was happening. I need you to message me if you're going to be late.'\n\nI-messages are not a magic formula — they work best when:\n- You speak calmly (use self-regulation first!)\n- You focus on specific behaviour, not character ('you were late' not 'you're selfish')\n- You are genuinely seeking understanding, not just winning\n\nPractice: Convert these You-messages into I-messages:\n1. 'You never help with the group project!'\n2. 'You told everyone my secret!'",
        "The 7-Step Conflict Resolution Process||Step 1: Cool down first. Never try to resolve conflict when emotions are at a peak. Use self-regulation techniques. Say 'I need 10 minutes and then I want to talk about this properly.'\n\nStep 2: Choose the right time and place. Private, calm, when both people have time and emotional space.\n\nStep 3: Each person shares their perspective using I-messages. The other person listens without interrupting.\n\nStep 4: Each person reflects back what they heard. 'What I heard you say is... Is that right?'\n\nStep 5: Identify the underlying needs. Ask: 'What do you need here?' and share what you need.\n\nStep 6: Brainstorm solutions together. No evaluating yet — just generate options.\n\nStep 7: Agree on a solution. Both must genuinely accept it. Write it down if helpful.\n\nExample scenario:\nAmir and Kofi are working on a group project. Amir wants to present the tech section; Kofi also wants to present the tech section.\n\nStep 3 — Amir: 'I feel anxious about the grade and I know the tech section best. I want to present it.'\nStep 3 — Kofi: 'I also know the tech well and presenting helps my confidence, which I'm working on.'\nStep 5 — Needs: Amir needs security about grade; Kofi needs confidence practice.\nStep 6 — Options: Split the tech section; Kofi presents with Amir as backup; coin toss; present together.\nStep 7 — Agreement: Kofi presents first half, Amir presents second half — both needs met.",
        "Peer Mediation and Knowing When to Seek Help||Sometimes two people cannot resolve a conflict alone and need a third party.\n\nPeer mediation: a neutral third person helps two others reach a solution.\nA good mediator:\n- Does NOT take sides\n- Helps both parties feel heard\n- Keeps the conversation focused on solutions\n- Does NOT impose a solution — guides the parties to find their own\n\nHow to be a peer mediator:\n1. Ask both parties if they agree to mediation\n2. Set ground rules: no interrupting, respectful language, confidentiality\n3. Each person shares their perspective (mediator reflects back)\n4. Mediator summarises: 'It sounds like you both need...'\n5. Guide brainstorming of solutions\n6. Help reach a mutually agreed outcome\n\nWhen to escalate to a trusted adult:\n- When there is any physical violence or threat of it\n- When there is bullying (repeated, deliberate, power imbalance)\n- When the conflict involves safeguarding concerns\n- When one party refuses to engage respectfully\n\nDifference between conflict and bullying:\nConflict = both parties have roughly equal power; it is mutual\nBullying = repeated, intentional harm by someone with more power over the target\nBullying requires adult intervention — not just mediation.\n\nRemember: asking for help is a sign of emotional intelligence, not weakness.",
      ],
    },
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Emotional Intelligence in School and Everyday Life",
      description: "Apply all five EQ skills in real academic and social situations — from exams to friendships to digital interactions.",
      content: "Emotional intelligence theory, developed by psychologists Peter Salovey and John Mayer and popularised by Daniel Goleman, identifies five key domains: self-awareness, self-regulation, motivation, empathy, and social skills. Research consistently shows that EQ is a better predictor of success in school, work, and relationships than IQ alone. This lesson is about making EQ practical — moving from understanding the concepts to actually applying them in the situations you face every day as a student.",
      duration: 42, difficulty: "intermediate",
      sections: [
        "EQ in the Classroom — Managing Academic Stress||School is one of the most emotionally demanding environments young people face: performance pressure, social dynamics, competition, and identity formation all happen simultaneously.\n\nCommon emotional challenges in school:\n- Exam anxiety: fear of failure, blanking on material you know\n- Perfectionism: all-or-nothing thinking, fear of making mistakes\n- Peer comparison: feeling behind or less capable than classmates\n- Teacher conflict: feeling misunderstood, criticised, or unfairly treated\n\nApplying EQ to exam anxiety:\n1. Self-awareness: 'I notice I feel physically tense and my thoughts are racing'\n2. Self-regulation: box breathing, 5-4-3-2-1 grounding\n3. Reframe: 'Anxiety is energy. I can channel this.'\n4. Growth mindset: 'This test measures my preparation today, not my intelligence forever'\n\nHandling a difficult mark:\nStep 1: Feel the disappointment — don't suppress it\nStep 2: Give yourself 24 hours before reacting (email, confronting teacher, etc.)\nStep 3: Review the feedback objectively\nStep 4: Ask the teacher for clarification respectfully: 'Could you help me understand what I could have done better?'\nStep 5: Make a specific improvement plan\n\nBuilding emotional safety in learning:\nAsk questions even when you feel embarrassed (everyone is wondering the same thing).\nThe willingness to not know is the beginning of learning.",
        "EQ in Friendships and Peer Relationships||Friendships in adolescence are intense and central to identity. EQ makes them deeper and more durable.\n\nEQ-based friendship:\n- You ask how your friend is doing AND you listen to the answer\n- You notice when they seem off even if they say 'I'm fine'\n- You are honest even when it's uncomfortable — you don't just say what they want to hear\n- You apologise when you are wrong\n- You allow them to have other friends without jealousy or pressure\n\nNavigating social exclusion (being left out):\nFeel the hurt — it's real and valid. Social rejection activates the same brain areas as physical pain.\nResist impulsive reactions (sub-tweeting, spreading rumours, confrontation while upset)\nTalk to someone you trust\nReflect: was this a misunderstanding? A one-off? A pattern? What do you need?\n\nDigital EQ — emotions online:\nEverything you type, post, or send carries emotional weight — but lacks tone, facial expression, and context. Before sending:\n- Would I say this to their face?\n- Could this be misread?\n- Am I sending this in a regulated emotional state or a reactive one?\n\nThe 24-hour rule: If you feel the urge to send an angry message, write it in a notes app, wait 24 hours, and decide then.\n\nCyberbullying: if you witness or experience it, document it (screenshots), do not retaliate, and report to a trusted adult or platform.",
        "The Five Domains of EQ — Self-Assessment||Use this lesson to assess yourself honestly in each domain. This is not about judging yourself — it is about knowing where to focus your growth.\n\n1. SELF-AWARENESS (1-10)\nDo you know what you are feeling in real time?\nDo you understand what triggers your emotions?\nDo you know your strengths and areas for growth honestly?\n\n2. SELF-REGULATION (1-10)\nCan you pause before reacting when upset?\nDo you recover quickly from setbacks?\nCan you manage stress effectively?\n\n3. MOTIVATION (1-10)\nDo you persist through difficulty?\nAre you driven by internal purpose rather than just grades or approval?\nDo you set and pursue meaningful goals?\n\n4. EMPATHY (1-10)\nCan you read others' emotions accurately?\nDo you genuinely try to understand different perspectives?\nDo people feel heard after talking to you?\n\n5. SOCIAL SKILLS (1-10)\nCan you navigate conflict constructively?\nDo you build trust in your relationships?\nCan you communicate clearly and honestly?\n\nWrite your scores. Circle your lowest. That is where to focus your practice over the next month.\n\nEQ is not fixed — every score can be improved with deliberate practice, self-reflection, and feedback from people who know you well.",
        "Creating Your Personal EQ Action Plan||Growth in emotional intelligence requires intentional, consistent practice — just like physical fitness.\n\n30-Day EQ Practice Plan:\n\nWeek 1 — Self-Awareness:\nDaily: Emotion check-in morning and evening (name 3 emotions)\nWrite in your EQ journal: What triggered strong emotions today? How did you respond?\n\nWeek 2 — Self-Regulation:\nPractice one breathing technique when you feel even slightly stressed\nApply STOP before any reactive communication (text, argument, etc.)\n\nWeek 3 — Empathy & Social Skills:\nHave one conversation per day where you focus 100% on listening\nWrite down one thing you genuinely appreciate about a different person each day\n\nWeek 4 — Integration:\nIdentify one ongoing conflict or tension in your life and apply the 7-step process\nWrite a letter to yourself (you won't send it) expressing how you want to show up emotionally\n\nLong-term EQ habits:\n- Keep an emotion journal (5 minutes per day)\n- Seek honest feedback from people you trust\n- Read books on human behaviour and psychology\n- Reflect after difficult conversations: what went well? What would I do differently?\n- Practice mindfulness — even 5 minutes of breathing meditation per day rewires the brain\n\nFinal reflection:\nEQ is not about being perfect. It is about being aware, honest, and willing to grow. Every person in this course has the capacity to develop deep emotional intelligence — starting with the simple act of paying attention to what you feel and why.",
      ],
    },
    {
      classId: emotionalClass.id, tutorId: tutor3.id,
      title: "Building Long-Term Emotional Wellness",
      description: "Develop daily habits and practices that protect your mental health, sustain your emotional wellbeing, and help you thrive long-term.",
      content: "Emotional wellness is not a destination — it is an ongoing practice of caring for your inner life. Just as physical health requires regular exercise, sleep, and nutrition, emotional health requires consistent attention to your thoughts, feelings, relationships, and habits. The World Health Organisation defines mental health as 'a state of wellbeing in which every individual realises their own potential, can cope with the normal stresses of life, can work productively, and is able to contribute to their community.' This final lesson brings together everything covered in this course into a sustainable, practical framework for lifelong emotional health.",
      duration: 35, difficulty: "beginner",
      sections: [
        "The Foundations of Emotional Wellbeing||Four non-negotiable foundations that science consistently links to emotional health:\n\n1. SLEEP (7-9 hours for teens)\nSleep deprivation worsens every emotional regulation skill:\n- More reactive to negative events\n- Less able to feel positive emotions\n- Poorer decision-making\n- Higher anxiety and irritability\nTip: Keep a consistent sleep/wake time even on weekends. Avoid screens 1 hour before bed.\n\n2. MOVEMENT\nExercise is the most effective, side-effect-free anti-anxiety and anti-depression intervention known.\n150 minutes of moderate activity per week is the WHO recommendation.\nEven a 10-minute walk changes brain chemistry within minutes.\n\n3. NUTRITION\nYour gut and brain are connected via the vagus nerve — the 'gut-brain axis'.\nDiet high in vegetables, whole grains, and protein supports stable mood.\nUltra-processed food and sugar cause blood sugar spikes and crashes that worsen anxiety and irritability.\n\n4. CONNECTION\nIsolation is one of the strongest risk factors for depression.\nMaintain at least one or two close, trusted relationships.\nInvest time in relationships even when you feel like withdrawing.\n\nThese four foundations do not replace professional support when needed — but without them, no amount of therapy or technique will be fully effective.",
        "Daily Emotional Hygiene Practices||Just as you brush your teeth every day to prevent problems, daily emotional hygiene prevents small stresses from accumulating into crises.\n\nMorning (5 minutes):\n- Intention setting: 'Today, I want to show up as [quality: patient, focused, kind].'\n- Quick body scan: any tension? Where? Take 3 deep breaths.\n- Review one goal or value you are working towards.\n\nDuring the day:\n- Pause and name your emotion when you notice a change in your mood\n- 1-minute breathing break between tasks (especially after difficult interactions)\n- Notice 3 positive things — not for toxic positivity, but to balance the negativity bias\n\nEvening (10 minutes):\n- 3 Things: write three things that went well today (however small)\n- EQ Reflection: Was there a moment I reacted rather than responded? What would I do differently?\n- Gratitude: one person you are grateful for today, and why\n\nWeekly (20 minutes):\n- Review your emotional patterns: what triggered you most this week?\n- Check in on your relationships: anyone you need to reach out to, repair with, or appreciate?\n- Assess your four foundations: sleep, movement, nutrition, connection — which needs attention?\n\nThese practices take under 20 minutes per day combined. The return on investment is enormous.",
        "Recognising When to Seek Professional Help||Emotional intelligence includes knowing when your needs are beyond what self-help can address.\n\nNormal emotional experiences that EQ practices can support:\n- Stress, worry, frustration\n- Sadness after disappointment or loss\n- Relationship difficulties\n- Low confidence or motivation\n- Mild anxiety before challenges\n\nSigns that professional support is recommended:\n- Persistent low mood lasting more than 2 weeks\n- Anxiety that prevents you from doing normal daily activities\n- Thoughts of harming yourself or others\n- Significant changes in sleep, appetite, or energy that last weeks\n- Feeling hopeless, worthless, or like a burden\n- Using substances (alcohol, drugs) to cope\n- Withdrawing from all relationships and activities\n\nWhat professional support looks like:\n- School counsellor: accessible, confidential, free\n- Psychologist or therapist: talk therapy (CBT, person-centred)\n- Psychiatrist: for medication when needed\n- Crisis lines: immediate support when you cannot wait\n\nSeeking help is one of the most emotionally intelligent acts possible. It requires self-awareness (knowing something is wrong), courage (overcoming stigma), and self-care (prioritising your wellbeing).\n\nIf a friend seems to be struggling: ask directly and kindly — 'I've noticed you seem really down lately. Are you okay? I'm here if you want to talk.' Listening without trying to fix is often the most powerful thing you can do.",
        "Your Emotional Intelligence: The Journey Ahead||You have now covered the five pillars of emotional intelligence:\n\n✅ Self-Awareness — knowing what you feel and why\n✅ Self-Regulation — choosing your response, not just reacting\n✅ Motivation — cultivating inner drive and resilience\n✅ Empathy — understanding and connecting with others\n✅ Social Skills — building trust, communicating, resolving conflict\n\nKey truths to carry forward:\n\n1. EQ is a practice, not a destination. You will never be 'done' — the goal is growth, not perfection.\n\n2. Your hardest emotions are your greatest teachers. Anger tells you a boundary was crossed. Sadness tells you something mattered. Fear tells you something feels unsafe. Every emotion is data.\n\n3. Relationship quality is the foundation of a good life. Invest in the people who matter. Show up for them. Let them show up for you.\n\n4. Self-compassion is not weakness. Treating yourself with the same kindness you would offer a good friend is one of the most powerful EQ practices.\n\n5. You have more agency than you think. You cannot control what happens to you. You CAN develop how you respond — and that changes everything.\n\nFinal exercise:\nWrite a letter to yourself, to be opened in one year.\nInclude:\n- Three EQ strengths you are proud of right now\n- One area you are committing to grow in\n- One relationship you want to invest in\n- One habit you will practise daily\n- A message of encouragement to your future self\n\nThe most emotionally intelligent people are not those who never struggle — they are the ones who keep learning about themselves and keep choosing to grow.",
      ],
    },
  ]);

  // ── QUIZZES ────────────────────────────────────────────────────────────────
  const [quiz1, quiz2] = await db.insert(quizzes).values([
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Python Basics Quiz",
      description: "Test your understanding of Python fundamentals.",
      questions: JSON.stringify([
        { question: "What function is used to print output in Python?", options: ["echo()", "console.log()", "print()", "write()"], correctAnswer: 2 },
        { question: "Which data type stores whole numbers in Python?", options: ["float", "int", "str", "bool"], correctAnswer: 1 },
        { question: "What does `len('hello')` return?", options: ["4", "5", "6", "Error"], correctAnswer: 1 },
        { question: "Which keyword starts a function definition in Python?", options: ["function", "def", "func", "define"], correctAnswer: 1 },
        { question: "What is the correct way to write a comment in Python?", options: ["// comment", "/* comment */", "# comment", "<!-- comment -->"], correctAnswer: 2 },
      ]),
      timeLimit: 10, passingScore: 60, maxAttempts: 3,
    },
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Algebra Variables Quiz",
      description: "Check your understanding of variables and expressions.",
      questions: JSON.stringify([
        { question: "If x = 4, what is 3x + 2?", options: ["10", "12", "14", "16"], correctAnswer: 2 },
        { question: "What does the variable represent in algebra?", options: ["A fixed number", "An unknown value", "A fraction", "An operation"], correctAnswer: 1 },
        { question: "Simplify: 5x + 3x", options: ["8", "8x", "15x", "53x"], correctAnswer: 1 },
        { question: "What is 2 + 3 × 4 using order of operations?", options: ["20", "14", "24", "10"], correctAnswer: 1 },
      ]),
      timeLimit: 8, passingScore: 75, maxAttempts: 2,
    },
  ]).returning();

  // ── ASSIGNMENTS ────────────────────────────────────────────────────────────
  const futureAssign = new Date();
  futureAssign.setDate(futureAssign.getDate() + 10);
  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 3);

  const [assign1, assign2, assign3] = await db.insert(assignments).values([
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Build a Calculator Program",
      description: "Create a Python calculator that performs addition, subtraction, multiplication and division.",
      instructions: "Write a Python program that:\n1. Asks the user for two numbers\n2. Asks for an operation (+, -, *, /)\n3. Displays the result\n4. Handles division by zero gracefully\n\nBonus: Add a loop so the user can do multiple calculations.",
      dueDate: futureAssign, maxScore: 100, allowLateSubmission: false,
    },
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "FizzBuzz Challenge",
      description: "Classic programming exercise to reinforce loops and conditionals.",
      instructions: "Write a Python program that prints numbers 1 to 100. For multiples of 3 print 'Fizz', for multiples of 5 print 'Buzz', for multiples of both print 'FizzBuzz'.",
      dueDate: pastDue, maxScore: 50, allowLateSubmission: true,
    },
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Solving Linear Equations",
      description: "Practice solving one-step and two-step linear equations.",
      instructions: "Solve the following equations and show your working:\n1. x + 7 = 12\n2. 3x = 21\n3. 2x + 5 = 17\n4. x/4 - 3 = 1\n5. 5(x - 2) = 20\n\nWrite out each step clearly.",
      dueDate: futureAssign, maxScore: 100, allowLateSubmission: false,
    },
  ]).returning();

  // ── QUIZ RESULTS ───────────────────────────────────────────────────────────
  await db.insert(quizResults).values([
    {
      quizId: quiz1.id, studentId: student1.id,
      score: 80,
      answers: JSON.stringify([2, 1, 1, 1, 0]),
      passed: true,
    },
    {
      quizId: quiz2.id, studentId: student1.id,
      score: 100,
      answers: JSON.stringify([2, 1, 1, 1]),
      passed: true,
    },
    {
      quizId: quiz1.id, studentId: student2.id,
      score: 60,
      answers: JSON.stringify([2, 0, 1, 1, 2]),
      passed: true,
    },
  ]);

  // ── ASSIGNMENT SUBMISSIONS ─────────────────────────────────────────────────
  const gradedDate = new Date();
  gradedDate.setDate(gradedDate.getDate() - 1);

  await db.insert(assignmentSubmissions).values([
    {
      assignmentId: assign2.id, studentId: student1.id,
      content: "for i in range(1, 101):\n    if i % 15 == 0:\n        print('FizzBuzz')\n    elif i % 3 == 0:\n        print('Fizz')\n    elif i % 5 == 0:\n        print('Buzz')\n    else:\n        print(i)",
      grade: 48, feedback: "Excellent solution! Perfect logic and clean code. Minor style tip: add a docstring at the top explaining what the program does.",
      gradedAt: gradedDate,
    },
    {
      assignmentId: assign3.id, studentId: student1.id,
      content: "1. x + 7 = 12  → x = 5\n2. 3x = 21  → x = 7\n3. 2x + 5 = 17  → 2x = 12 → x = 6\n4. x/4 - 3 = 1  → x/4 = 4 → x = 16\n5. 5(x-2) = 20  → x-2 = 4 → x = 6",
      grade: null, feedback: null, gradedAt: null,
    },
    {
      assignmentId: assign2.id, studentId: student2.id,
      content: "n = 1\nwhile n <= 100:\n    if n % 3 == 0 and n % 5 == 0:\n        print('FizzBuzz')\n    elif n % 3 == 0:\n        print('Fizz')\n    elif n % 5 == 0:\n        print('Buzz')\n    else:\n        print(n)\n    n += 1",
      grade: 45, feedback: "Good work! Using while loop is valid. Consider using range() for more Pythonic style.",
      gradedAt: gradedDate,
    },
  ]);

  // ── COURSE PROGRESS ────────────────────────────────────────────────────────
  await db.insert(courseProgress).values([
    { userId: student1.id, classId: pythonClass.id, lectureNumber: 1, completed: true, watchTimeSeconds: 1820 },
    { userId: student1.id, classId: pythonClass.id, lectureNumber: 2, completed: true, watchTimeSeconds: 2700 },
    { userId: student1.id, classId: pythonClass.id, lectureNumber: 3, completed: false, watchTimeSeconds: 840 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 1, completed: true, watchTimeSeconds: 2100 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 2, completed: true, watchTimeSeconds: 1980 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 3, completed: true, watchTimeSeconds: 2240 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 4, completed: true, watchTimeSeconds: 1750 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 5, completed: true, watchTimeSeconds: 1900 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 6, completed: true, watchTimeSeconds: 2000 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 7, completed: true, watchTimeSeconds: 2100 },
    { userId: student1.id, classId: algebraClass.id, lectureNumber: 8, completed: true, watchTimeSeconds: 1850 },
    { userId: student2.id, classId: webDevClass.id, lectureNumber: 1, completed: true, watchTimeSeconds: 3600 },
    { userId: student2.id, classId: webDevClass.id, lectureNumber: 2, completed: true, watchTimeSeconds: 3200 },
    { userId: student2.id, classId: webDevClass.id, lectureNumber: 3, completed: false, watchTimeSeconds: 900 },
  ]);

  // ── CERTIFICATES ───────────────────────────────────────────────────────────
  // student1 completed algebra (8/8 lectures done above)
  const [booking1] = await db.insert(bookings).values({
    studentId: student1.id, classId: algebraClass.id, tutorId: tutor1.id,
    scheduledDate: recentDate, scheduledTime: "10:00", duration: 60, status: "completed",
  }).returning();

  await db.insert(certificates).values([
    {
      studentId: student1.id, classId: algebraClass.id, bookingId: booking1.id,
      studentName: student1.name, courseName: algebraClass.title, tutorName: tutor1.name,
      verificationCode: crypto.randomUUID(),
    },
  ]);

  // ── NOTES ──────────────────────────────────────────────────────────────────
  await db.insert(notes).values([
    {
      userId: student1.id, classId: pythonClass.id,
      topic: "Python Print Function",
      content: "print() is used to display output.\nCan print strings, numbers, variables.\nExample: print('Hello', name, 42)\nSep and end params: print('a', 'b', sep='-') → a-b",
      tags: ["python", "basics", "output"],
    },
    {
      userId: student1.id, classId: pythonClass.id,
      topic: "Loop Cheat Sheet",
      content: "FOR loop: use when you know the number of iterations\n  for i in range(10):\n\nWHILE loop: use when you check a condition\n  while condition:\n\nbreak: exit loop early\ncontinue: skip to next iteration",
      tags: ["python", "loops", "cheatsheet"],
    },
    {
      userId: student1.id, classId: algebraClass.id,
      topic: "Order of Operations",
      content: "PEMDAS:\nP - Parentheses first\nE - Exponents\nM - Multiplication\nD - Division\nA - Addition\nS - Subtraction\n\nLeft to right for M/D and A/S",
      tags: ["algebra", "math", "rules"],
    },
    {
      userId: student2.id, classId: webDevClass.id,
      topic: "CSS Box Model",
      content: "Every HTML element has:\n- content (actual text/image)\n- padding (space inside border)\n- border\n- margin (space outside border)\n\nbox-sizing: border-box makes width include padding+border",
      tags: ["css", "layout", "web"],
    },
    {
      userId: student1.id, classId: null,
      topic: "General Study Tips",
      content: "1. Study in 25-min Pomodoro blocks\n2. Review notes within 24 hours\n3. Teach concepts to others\n4. Practice more than reading\n5. Sleep 8+ hours before exams",
      tags: ["productivity", "study"],
    },
  ]);

  // ── DISCUSSIONS ────────────────────────────────────────────────────────────
  const [disc1, disc2, disc3] = await db.insert(discussions).values([
    {
      classId: pythonClass.id, authorId: student1.id,
      title: "How do I use f-strings?",
      content: "I've seen f-strings in tutorials but I'm not sure how to use them properly. Can someone explain with an example?",
      isPinned: false, replyCount: 2,
    },
    {
      classId: pythonClass.id, authorId: tutor1.id,
      title: "📌 Important: Week 2 Assignment Tips",
      content: "For the FizzBuzz assignment, remember to test your code with edge cases like 15, 30, and 45. Make sure your if/elif order is correct — check for 15 (divisible by both) FIRST.",
      isPinned: true, replyCount: 1,
    },
    {
      classId: algebraClass.id, authorId: student1.id,
      title: "Confused about negative variables",
      content: "When we have -x and x = -3, does -x become +3? I keep getting confused with double negatives.",
      isPinned: false, replyCount: 1,
    },
  ]).returning();

  await db.insert(discussionReplies).values([
    {
      discussionId: disc1.id, authorId: tutor1.id,
      content: "Great question! f-strings are the modern way to format strings in Python:\n\n```python\nname = 'Kofi'\nage = 14\nprint(f'My name is {name} and I am {age} years old.')\n```\n\nJust put an `f` before the quote and use `{}` to embed variables. You can even do expressions: `f'2 + 2 = {2+2}'`",
    },
    {
      discussionId: disc1.id, authorId: student2.id,
      content: "Thanks! I also saw you can format numbers: `f'{3.14159:.2f}'` → `3.14`. Very useful!",
    },
    {
      discussionId: disc2.id, authorId: student1.id,
      content: "Thanks for the tip! I made that mistake earlier — had `elif i % 3 == 0 and i % 5 == 0` after the individual checks and it never matched. Moving it first fixed everything.",
    },
    {
      discussionId: disc3.id, authorId: tutor1.id,
      content: "Yes, exactly right! A negative of a negative is positive:\n\n- x = -3\n- -x = -(-3) = +3\n\nThink of it like: the minus sign 'flips' the sign of whatever follows it. So -(-3) flips negative to positive.",
    },
  ]);

  // ── FAVORITES (Student Library → Saved Classes) ─────────────────────────
  await db.insert(favorites).values([
    { userId: student1.id, classId: createdClasses[4].id },  // Cybersecurity Basics
    { userId: student1.id, classId: createdClasses[15].id }, // Emotional Intelligence
    { userId: student1.id, classId: createdClasses[27].id }, // Physics Fundamentals
    { userId: student2.id, classId: createdClasses[0].id },  // Python Programming
    { userId: student2.id, classId: createdClasses[10].id }, // Algebra Made Easy
    { userId: student2.id, classId: createdClasses[32].id }, // Digital Art & Design
    { userId: student3.id, classId: createdClasses[1].id },  // Web Development
    { userId: student3.id, classId: createdClasses[29].id }, // Biology & Life Sciences
  ]);

  // ── CONTACT SUBMISSIONS (Admin Communications tab) ──────────────────────
  await db.insert(contactSubmissions).values([
    {
      name: "Maria Santos",
      email: "maria.santos@gmail.com",
      subject: "Partnership Enquiry",
      message: "Hello, I run a children's charity in Brazil and would love to explore a partnership with TutorBridge. We have 150 students across 3 orphanages who would benefit greatly from your platform. Could we schedule a call to discuss?",
    },
    {
      name: "John Appiah",
      email: "john.appiah@outlook.com",
      subject: "Volunteer Tutor Application",
      message: "I'm a retired mathematics teacher with 25 years of experience. I heard about TutorBridge through a colleague and would love to volunteer my time to help orphanage students. How do I get started?",
    },
    {
      name: "Fatima Yusuf",
      email: "fatima.y@yahoo.com",
      subject: "Technical Issue — Cannot Upload Assignment",
      message: "I keep getting an error when trying to upload my assignment for the Python Programming course. The file is a PDF under 5MB. I've tried Chrome and Firefox. The error says 'Upload failed' with no other details. Please help!",
    },
    {
      name: "David Osei",
      email: "david.osei@gmail.com",
      subject: "Feedback on the Platform",
      message: "Just wanted to say thank you for creating TutorBridge. The children at Hope Children's Home have been learning so much. The Python course especially has sparked a real interest in coding. Keep up the amazing work!",
    },
  ]);

  // ── PEER HELPERS (Admin Volunteers tab + Student Peer Help) ─────────────
  // student1 scored 80% on Python quiz → qualifies as peer helper
  const [helper1] = await db.insert(peerHelpers).values([
    { userId: student1.id, classId: pythonClass.id, topic: "Python Basics", quizScore: 80 },
    { userId: student1.id, classId: algebraClass.id, topic: "Variables & Expressions", quizScore: 100 },
    { userId: student3.id, classId: createdClasses[27].id, topic: "Newton's Laws", quizScore: 85 },
  ]).returning();

  // ── PEER HELP REQUESTS ──────────────────────────────────────────────────
  const [helpReq1, helpReq2, helpReq3] = await db.insert(peerHelpRequests).values([
    {
      studentId: student2.id, classId: pythonClass.id,
      topic: "Python Loops",
      description: "I don't understand the difference between for loops and while loops. When should I use each one? Can someone explain with examples?",
      status: "matched", helperId: student1.id,
    },
    {
      studentId: student4.id, classId: algebraClass.id,
      topic: "Solving Equations",
      description: "I'm stuck on two-step equations. I understand one-step (like x + 5 = 12) but when there are two operations I get confused about which to undo first.",
      status: "open", helperId: null,
    },
    {
      studentId: student5.id, classId: pythonClass.id,
      topic: "Functions in Python",
      description: "Can someone help me understand return values vs print? My function works when I use print but not when I try to use the result in another calculation.",
      status: "resolved", helperId: student1.id,
    },
  ]).returning();

  // ── PEER SESSIONS (Admin Peer Sessions tab) ────────────────────────────
  const peerDate1 = new Date();
  peerDate1.setDate(peerDate1.getDate() + 3);
  const peerDate2 = new Date();
  peerDate2.setDate(peerDate2.getDate() + 5);

  await db.insert(peerSessions).values([
    {
      requestId: helpReq1.id,
      requesterId: student2.id, helperId: student1.id, classId: pythonClass.id,
      proposedDate: peerDate1.toISOString().split("T")[0],
      proposedTime: "15:00",
      status: "approved",
      coordinatorNotes: "Good match — Kofi scored well on Python basics.",
      approvedBy: coordinator.id,
    },
    {
      requestId: helpReq3.id,
      requesterId: student5.id, helperId: student1.id, classId: pythonClass.id,
      proposedDate: pastDate2.toISOString().split("T")[0],
      proposedTime: "14:00",
      status: "completed",
      coordinatorNotes: "Session completed successfully. Taiwo reports understanding return values now.",
      approvedBy: coordinator.id,
    },
    {
      requestId: helpReq2.id,
      requesterId: student4.id, helperId: student1.id, classId: algebraClass.id,
      proposedDate: peerDate2.toISOString().split("T")[0],
      proposedTime: "11:00",
      status: "pending_approval",
      coordinatorNotes: null,
      approvedBy: null,
    },
  ]);

  // ── MESSAGES (All dashboards → Messages page) ──────────────────────────
  // conversationId format: "min(senderId,receiverId)-max(senderId,receiverId)"
  const msgDate1 = new Date(); msgDate1.setDate(msgDate1.getDate() - 5);
  const msgDate2 = new Date(); msgDate2.setDate(msgDate2.getDate() - 5); msgDate2.setHours(msgDate2.getHours() + 1);
  const msgDate3 = new Date(); msgDate3.setDate(msgDate3.getDate() - 4);
  const msgDate4 = new Date(); msgDate4.setDate(msgDate4.getDate() - 4); msgDate4.setHours(msgDate4.getHours() + 2);
  const msgDate5 = new Date(); msgDate5.setDate(msgDate5.getDate() - 3);
  const msgDate6 = new Date(); msgDate6.setDate(msgDate6.getDate() - 3); msgDate6.setHours(msgDate6.getHours() + 1);
  const msgDate7 = new Date(); msgDate7.setDate(msgDate7.getDate() - 2);
  const msgDate8 = new Date(); msgDate8.setDate(msgDate8.getDate() - 2); msgDate8.setHours(msgDate8.getHours() + 3);
  const msgDate9 = new Date(); msgDate9.setDate(msgDate9.getDate() - 1);
  const msgDate10 = new Date(); msgDate10.setDate(msgDate10.getDate() - 1); msgDate10.setHours(msgDate10.getHours() + 1);

  // Conversation: student1 (Kofi) ↔ tutor1 (James) — about Python class
  const conv1 = [student1.id, tutor1.id].sort().join("-");
  // Conversation: student2 (Nia) ↔ tutor3 (Priya) — about English class
  const conv2 = [student2.id, tutor3.id].sort().join("-");
  // Conversation: student1 (Kofi) ↔ coordinator — about certificate
  const conv3 = [student1.id, coordinator.id].sort().join("-");
  // Conversation: tutor1 (James) ↔ coordinator — about class approval
  const conv4 = [tutor1.id, coordinator.id].sort().join("-");
  // Conversation: student3 (Emeka) ↔ tutor2 (Amara) — about physics
  const conv5 = [student3.id, tutor2.id].sort().join("-");
  // Conversation: student1 (Kofi) ↔ student2 (Nia) — peer help
  const conv6 = [student1.id, student2.id].sort().join("-");

  await db.insert(messages).values([
    // Kofi ↔ James (Python help)
    { senderId: student1.id, receiverId: tutor1.id, content: "Hi James! I'm stuck on the for loop exercise in Lesson 2. I keep getting an IndentationError. Can you help?", conversationId: conv1, isRead: true, createdAt: msgDate1 },
    { senderId: tutor1.id, receiverId: student1.id, content: "Hi Kofi! IndentationError means your code block isn't properly indented. In Python, the code inside a for loop must be indented by 4 spaces. Can you share the code you wrote?", conversationId: conv1, isRead: true, createdAt: msgDate2 },
    { senderId: student1.id, receiverId: tutor1.id, content: "Oh! I was using a tab instead of spaces. It works now. Thank you so much! 🙏", conversationId: conv1, isRead: true, createdAt: msgDate3 },
    { senderId: tutor1.id, receiverId: student1.id, content: "Great job fixing that! A tip: configure your editor to convert tabs to 4 spaces automatically. Also, your quiz score of 80% was excellent — keep up the great work!", conversationId: conv1, isRead: false, createdAt: msgDate4 },

    // Nia ↔ Priya (English writing)
    { senderId: student2.id, receiverId: tutor3.id, content: "Hello Priya, I wanted to ask about the creative writing assignment. Can I write about a personal experience instead of fiction?", conversationId: conv2, isRead: true, createdAt: msgDate1 },
    { senderId: tutor3.id, receiverId: student2.id, content: "Hello Nia! Absolutely, personal narratives are wonderful for creative writing. They're often the most powerful pieces. Just make sure to use descriptive language and sensory details.", conversationId: conv2, isRead: true, createdAt: msgDate2 },
    { senderId: student2.id, receiverId: tutor3.id, content: "Thank you! I'll write about my journey of learning art and how it changed my perspective. I'll submit it by Friday.", conversationId: conv2, isRead: true, createdAt: msgDate5 },
    { senderId: tutor3.id, receiverId: student2.id, content: "That sounds like a beautiful topic, Nia. Remember to structure it with a clear beginning, turning point, and reflection at the end. Looking forward to reading it!", conversationId: conv2, isRead: false, createdAt: msgDate6 },

    // Kofi ↔ Coordinator (certificate question)
    { senderId: student1.id, receiverId: coordinator.id, content: "Hi Sarah, I completed all 8 lectures in Algebra Made Easy and received my certificate. How can I share it with my orphanage coordinator?", conversationId: conv3, isRead: true, createdAt: msgDate3 },
    { senderId: coordinator.id, receiverId: student1.id, content: "Congratulations on completing the course, Kofi! You can share the certificate verification link — it's on your Certificates page. Anyone can verify it publicly using that link.", conversationId: conv3, isRead: true, createdAt: msgDate4 },
    { senderId: student1.id, receiverId: coordinator.id, content: "Perfect, I found it! Thank you Sarah. I'm hoping to complete the Python course next month too.", conversationId: conv3, isRead: false, createdAt: msgDate7 },

    // James ↔ Coordinator (class discussion)
    { senderId: tutor1.id, receiverId: coordinator.id, content: "Hi Sarah, I'd like to create a new advanced Python course focused on data structures. Should I go ahead or do you need to review the curriculum first?", conversationId: conv4, isRead: true, createdAt: msgDate5 },
    { senderId: coordinator.id, receiverId: tutor1.id, content: "Hi James, that sounds great! Go ahead and create it. I'll review the content once it's up. Make sure to include prerequisites so students know they need the beginner course first.", conversationId: conv4, isRead: true, createdAt: msgDate6 },
    { senderId: tutor1.id, receiverId: coordinator.id, content: "Will do! I'll also add a quiz to assess readiness before enrollment. Should have it ready by next week.", conversationId: conv4, isRead: false, createdAt: msgDate8 },

    // Emeka ↔ Amara (physics question)
    { senderId: student3.id, receiverId: tutor2.id, content: "Hi Amara, I'm having trouble understanding Newton's Third Law. How can two equal and opposite forces not cancel out?", conversationId: conv5, isRead: true, createdAt: msgDate7 },
    { senderId: tutor2.id, receiverId: student3.id, content: "Great question, Emeka! The key is that the two forces act on DIFFERENT objects. When you push a wall, you push the wall and the wall pushes you back — but these forces are on different objects, so they don't cancel.", conversationId: conv5, isRead: true, createdAt: msgDate8 },
    { senderId: student3.id, receiverId: tutor2.id, content: "Oh that makes so much sense now! So when I walk, I push the ground backward and the ground pushes me forward?", conversationId: conv5, isRead: true, createdAt: msgDate9 },
    { senderId: tutor2.id, receiverId: student3.id, content: "Exactly right! You've got it. That's a perfect real-world example. Keep thinking about physics in everyday situations — it really helps with understanding.", conversationId: conv5, isRead: false, createdAt: msgDate10 },

    // Kofi ↔ Nia (peer help)
    { senderId: student2.id, receiverId: student1.id, content: "Hey Kofi! Thanks for helping me with the Python loops yesterday. The for loop vs while loop difference is much clearer now.", conversationId: conv6, isRead: true, createdAt: msgDate9 },
    { senderId: student1.id, receiverId: student2.id, content: "You're welcome, Nia! Happy to help anytime. If you get stuck on the functions lesson, just message me. That one can be tricky too.", conversationId: conv6, isRead: false, createdAt: msgDate10 },
  ]);

  // ── LOGIN HISTORY (Auth Sessions page) ────────────────────────────────
  const loginDate1 = new Date(); loginDate1.setDate(loginDate1.getDate() - 7);
  const loginDate2 = new Date(); loginDate2.setDate(loginDate2.getDate() - 5);
  const loginDate3 = new Date(); loginDate3.setDate(loginDate3.getDate() - 3);
  const loginDate4 = new Date(); loginDate4.setDate(loginDate4.getDate() - 1);
  const loginDate5 = new Date();

  await db.insert(loginHistory).values([
    // Kofi (student1) — 4 login sessions
    { userId: student1.id, ip: "192.168.1.100", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate1 },
    { userId: student1.id, ip: "192.168.1.100", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate3 },
    { userId: student1.id, ip: "10.0.0.45", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15", createdAt: loginDate4 },
    { userId: student1.id, ip: "192.168.1.100", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate5 },
    // Nia (student2)
    { userId: student2.id, ip: "192.168.1.101", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate2 },
    { userId: student2.id, ip: "192.168.1.101", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate5 },
    // James (tutor1)
    { userId: tutor1.id, ip: "172.16.0.10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/126.0", createdAt: loginDate1 },
    { userId: tutor1.id, ip: "172.16.0.10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/126.0", createdAt: loginDate2 },
    { userId: tutor1.id, ip: "172.16.0.10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/126.0", createdAt: loginDate4 },
    { userId: tutor1.id, ip: "172.16.0.10", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/126.0", createdAt: loginDate5 },
    // Amara (tutor2)
    { userId: tutor2.id, ip: "172.16.0.20", userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate2 },
    { userId: tutor2.id, ip: "172.16.0.20", userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate5 },
    // Coordinator (Sarah)
    { userId: coordinator.id, ip: "10.10.10.1", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate1 },
    { userId: coordinator.id, ip: "10.10.10.1", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate3 },
    { userId: coordinator.id, ip: "10.10.10.1", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate5 },
    // Emeka (student3)
    { userId: student3.id, ip: "192.168.1.102", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate3 },
    { userId: student3.id, ip: "192.168.1.102", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0", createdAt: loginDate5 },
  ]);

  // ── USER SETTINGS (Settings page) ─────────────────────────────────────
  await db.insert(userSettings).values([
    {
      userId: student1.id,
      emailNotifications: true, pushNotifications: true, bookingReminders: true,
      messageAlerts: true, reviewNotifications: true, marketingEmails: false,
      messagingPreference: "everyone", showProfilePublicly: true,
      sessionTimeout: 30, theme: "light", language: "English", timezone: "Africa/Accra",
      autoplayVideos: true, learningGoals: "Complete Python and Web Development courses by end of term",
      preferredSubjects: ["Programming", "Mathematics"],
      studyReminders: true, platformAlerts: true,
    },
    {
      userId: student2.id,
      emailNotifications: true, pushNotifications: true, bookingReminders: true,
      messageAlerts: true, reviewNotifications: false, marketingEmails: false,
      messagingPreference: "everyone", showProfilePublicly: true,
      sessionTimeout: 30, theme: "dark", language: "English", timezone: "Africa/Lagos",
      autoplayVideos: false, learningGoals: "Improve creative writing and learn basic web design",
      preferredSubjects: ["Creative Arts", "Languages", "Programming"],
      studyReminders: true, platformAlerts: true,
    },
    {
      userId: tutor1.id,
      emailNotifications: true, pushNotifications: true, bookingReminders: true,
      messageAlerts: true, reviewNotifications: true, marketingEmails: false,
      messagingPreference: "everyone", showProfilePublicly: true,
      sessionTimeout: 60, theme: "light", language: "English", timezone: "Africa/Accra",
      autoplayVideos: true, teachingPreferences: "Interactive live sessions with hands-on coding exercises",
      availabilitySchedule: { monday: ["09:00-12:00", "14:00-17:00"], tuesday: ["09:00-12:00"], wednesday: ["09:00-12:00", "14:00-17:00"], thursday: ["09:00-12:00"], friday: ["09:00-12:00"] },
      platformAlerts: true,
    },
    {
      userId: coordinator.id,
      emailNotifications: true, pushNotifications: true, bookingReminders: true,
      messageAlerts: true, reviewNotifications: true, marketingEmails: false,
      messagingPreference: "everyone", showProfilePublicly: true,
      sessionTimeout: 60, theme: "light", language: "English", timezone: "UTC",
      autoplayVideos: true, platformAlerts: true,
    },
  ]);

  // ── ADDITIONAL QUIZ RESULTS (students 3-5) ────────────────────────────
  await db.insert(quizResults).values([
    { quizId: quiz1.id, studentId: student3.id, score: 60, answers: JSON.stringify([2, 1, 0, 0, 2]), passed: true },
    { quizId: quiz1.id, studentId: student4.id, score: 40, answers: JSON.stringify([2, 0, 0, 0, 2]), passed: false },
    { quizId: quiz2.id, studentId: student3.id, score: 75, answers: JSON.stringify([2, 1, 1, 0]), passed: true },
    { quizId: quiz2.id, studentId: student4.id, score: 100, answers: JSON.stringify([2, 1, 1, 1]), passed: true },
    { quizId: quiz1.id, studentId: student5.id, score: 100, answers: JSON.stringify([2, 1, 1, 1, 2]), passed: true },
  ]);

  // ── ADDITIONAL COURSE PROGRESS (students 3-5) ─────────────────────────
  await db.insert(courseProgress).values([
    // Emeka — Python progress (4/12)
    { userId: student3.id, classId: pythonClass.id, lectureNumber: 1, completed: true, watchTimeSeconds: 1900 },
    { userId: student3.id, classId: pythonClass.id, lectureNumber: 2, completed: true, watchTimeSeconds: 2800 },
    { userId: student3.id, classId: pythonClass.id, lectureNumber: 3, completed: true, watchTimeSeconds: 2400 },
    { userId: student3.id, classId: pythonClass.id, lectureNumber: 4, completed: false, watchTimeSeconds: 600 },
    // Amina — Algebra progress (5/8)
    { userId: student4.id, classId: algebraClass.id, lectureNumber: 1, completed: true, watchTimeSeconds: 2100 },
    { userId: student4.id, classId: algebraClass.id, lectureNumber: 2, completed: true, watchTimeSeconds: 1800 },
    { userId: student4.id, classId: algebraClass.id, lectureNumber: 3, completed: true, watchTimeSeconds: 2300 },
    { userId: student4.id, classId: algebraClass.id, lectureNumber: 4, completed: true, watchTimeSeconds: 1650 },
    { userId: student4.id, classId: algebraClass.id, lectureNumber: 5, completed: false, watchTimeSeconds: 400 },
    // Taiwo — Python progress (6/12)
    { userId: student5.id, classId: pythonClass.id, lectureNumber: 1, completed: true, watchTimeSeconds: 1800 },
    { userId: student5.id, classId: pythonClass.id, lectureNumber: 2, completed: true, watchTimeSeconds: 2700 },
    { userId: student5.id, classId: pythonClass.id, lectureNumber: 3, completed: true, watchTimeSeconds: 2500 },
    { userId: student5.id, classId: pythonClass.id, lectureNumber: 4, completed: true, watchTimeSeconds: 2200 },
    { userId: student5.id, classId: pythonClass.id, lectureNumber: 5, completed: true, watchTimeSeconds: 2600 },
    { userId: student5.id, classId: pythonClass.id, lectureNumber: 6, completed: false, watchTimeSeconds: 300 },
  ]);

  // ── ADDITIONAL ASSIGNMENT SUBMISSIONS ──────────────────────────────────
  await db.insert(assignmentSubmissions).values([
    {
      assignmentId: assign1.id, studentId: student3.id,
      content: "num1 = float(input('Enter first number: '))\nnum2 = float(input('Enter second number: '))\nop = input('Enter operation (+, -, *, /): ')\nif op == '+':\n    print(num1 + num2)\nelif op == '-':\n    print(num1 - num2)\nelif op == '*':\n    print(num1 * num2)\nelif op == '/':\n    if num2 == 0:\n        print('Cannot divide by zero!')\n    else:\n        print(num1 / num2)",
      grade: 92, feedback: "Excellent implementation with good division-by-zero handling! Consider adding input validation for the operator.",
      gradedAt: gradedDate,
    },
    {
      assignmentId: assign1.id, studentId: student5.id,
      content: "while True:\n    num1 = float(input('First number: '))\n    op = input('Operator (+,-,*,/): ')\n    num2 = float(input('Second number: '))\n    if op == '+': result = num1 + num2\n    elif op == '-': result = num1 - num2\n    elif op == '*': result = num1 * num2\n    elif op == '/': result = num1 / num2 if num2 != 0 else 'Error'\n    print(f'Result: {result}')\n    if input('Continue? (y/n): ') != 'y': break",
      grade: 98, feedback: "Outstanding! You included the bonus loop feature and f-string formatting. Clean and professional code.",
      gradedAt: gradedDate,
    },
  ]);

  // ── ADDITIONAL NOTES (students 3-5) ────────────────────────────────────
  await db.insert(notes).values([
    {
      userId: student3.id, classId: pythonClass.id,
      topic: "Python Data Types Reference",
      content: "Main data types:\n- int: whole numbers (1, 42, -7)\n- float: decimals (3.14, -0.5)\n- str: text ('hello', \"world\")\n- bool: True or False\n- list: ordered collection [1, 2, 3]\n- dict: key-value pairs {'name': 'Emeka'}\n- tuple: immutable collection (1, 2, 3)",
      tags: ["python", "data-types", "reference"],
    },
    {
      userId: student4.id, classId: algebraClass.id,
      topic: "Solving Two-Step Equations",
      content: "Steps to solve:\n1. Undo addition/subtraction first\n2. Then undo multiplication/division\n\nExample: 2x + 5 = 17\n→ 2x = 17 - 5 = 12\n→ x = 12 / 2 = 6\n\nAlways check: 2(6) + 5 = 17 ✓",
      tags: ["algebra", "equations", "steps"],
    },
    {
      userId: student5.id, classId: pythonClass.id,
      topic: "Python Functions Summary",
      content: "Defining functions:\ndef function_name(parameter):\n    # do something\n    return result\n\nKey points:\n- def keyword starts the definition\n- Parameters go in parentheses\n- return sends a value back\n- Without return, function returns None\n- Can have default parameters: def greet(name='World')",
      tags: ["python", "functions", "summary"],
    },
    {
      userId: student3.id, classId: null,
      topic: "My Study Schedule",
      content: "Monday: Python (2 hrs) + Physics review (1 hr)\nTuesday: Biology reading + Chemistry lab notes\nWednesday: Python practice problems\nThursday: Mathematics + Physics problems\nFriday: Review all notes + practice quizzes\nWeekend: Project work + catch up on lessons",
      tags: ["schedule", "productivity"],
    },
  ]);

  // ── ADDITIONAL NOTIFICATIONS ───────────────────────────────────────────
  await db.insert(notifications).values([
    // More student notifications
    { userId: student1.id, type: "message", title: "New Message from James", message: "James Owusu sent you a message about Python indentation", isRead: false, link: "/messages" },
    { userId: student1.id, type: "system", title: "Certificate Earned! 🎓", message: "Congratulations! You've earned a certificate for completing Algebra Made Easy", isRead: true, link: "/student-dashboard" },
    { userId: student2.id, type: "message", title: "New Message from Priya", message: "Priya Sharma responded to your writing question", isRead: false, link: "/messages" },
    { userId: student2.id, type: "booking", title: "Upcoming Session Tomorrow", message: "Reminder: Your Emotional Intelligence class is scheduled for tomorrow at 4:00 PM", isRead: false },
    { userId: student3.id, type: "system", title: "Welcome to TutorBridge!", message: "Start exploring courses and connect with expert tutors", isRead: true },
    { userId: student3.id, type: "booking", title: "Booking Completed", message: "Your Python Programming session has been marked as completed. Great work!", isRead: false },
    { userId: student4.id, type: "system", title: "Welcome to TutorBridge!", message: "Start exploring courses and connect with tutors who can help you learn", isRead: true },
    { userId: student4.id, type: "system", title: "Quiz Available", message: "A new quiz is available for Algebra Made Easy. Test your knowledge!", isRead: false, link: "/student-dashboard" },
    { userId: student5.id, type: "system", title: "Welcome to TutorBridge!", message: "Start your learning journey with us. Browse courses to get started!", isRead: true },
    { userId: student5.id, type: "system", title: "Peer Help Resolved", message: "Your peer help request for 'Functions in Python' has been resolved. Hope it helped!", isRead: false },
    // More tutor notifications
    { userId: tutor1.id, type: "booking", title: "Session Completed", message: "Your Python Programming session with Emeka has been marked as completed", isRead: true },
    { userId: tutor1.id, type: "system", title: "New Student Enrolled", message: "Taiwo Adeyemi has enrolled in your Python Programming course", isRead: false },
    { userId: tutor1.id, type: "review", title: "New 5-Star Review! ⭐", message: "A student left you a glowing 5-star review for Algebra Made Easy", isRead: false },
    { userId: tutor2.id, type: "message", title: "New Message from Emeka", message: "Emeka Nwosu asked about Newton's Third Law", isRead: false, link: "/messages" },
    { userId: tutor2.id, type: "booking", title: "New Booking", message: "A student has booked your Chemistry Basics class", isRead: false },
    { userId: tutor3.id, type: "review", title: "New Review", message: "Nia left you a review for Emotional Intelligence Mastery", isRead: false },
    { userId: tutor3.id, type: "message", title: "New Message from Nia", message: "Nia Okafor asked about the creative writing assignment", isRead: false, link: "/messages" },
    // More coordinator notifications
    { userId: coordinator.id, type: "system", title: "Safeguarding Report Filed", message: "A new harassment report has been submitted and requires your attention", isRead: false, link: "/admin" },
    { userId: coordinator.id, type: "system", title: "Peer Session Pending", message: "A new peer tutoring session is awaiting your approval", isRead: false, link: "/admin" },
    { userId: coordinator.id, type: "system", title: "Weekly Summary", message: "This week: 3 new signups, 5 completed sessions, 2 new reviews. Platform running smoothly.", isRead: true },
    { userId: coordinator.id, type: "system", title: "Contact Form Submission", message: "Maria Santos submitted a partnership enquiry. Review it in the Communications tab.", isRead: false, link: "/admin" },
  ]);

  // ── ADDITIONAL BOOKINGS (students 3-5 for more enrolled classes) ───────
  // Note: These give students 3-5 proper enrolled classes visible in their dashboards
  await db.insert(bookings).values([
    { studentId: student3.id, classId: createdClasses[27].id, tutorId: tutor2.id, scheduledDate: futureDate, scheduledTime: "10:00", duration: 60, status: "confirmed" }, // Physics
    { studentId: student3.id, classId: createdClasses[28].id, tutorId: tutor2.id, scheduledDate: futureDate2, scheduledTime: "14:00", duration: 70, status: "confirmed" }, // Chemistry
    { studentId: student4.id, classId: createdClasses[10].id, tutorId: tutor1.id, scheduledDate: futureDate, scheduledTime: "09:00", duration: 60, status: "confirmed" }, // Algebra
    { studentId: student4.id, classId: createdClasses[24].id, tutorId: tutor3.id, scheduledDate: futureDate2, scheduledTime: "11:00", duration: 75, status: "confirmed" }, // Spanish
    { studentId: student5.id, classId: createdClasses[0].id, tutorId: tutor1.id, scheduledDate: futureDate, scheduledTime: "15:00", duration: 120, status: "confirmed" }, // Python
    { studentId: student5.id, classId: createdClasses[35].id, tutorId: tutor3.id, scheduledDate: futureDate2, scheduledTime: "10:00", duration: 40, status: "confirmed" }, // Resume Writing
  ]);

  // ── WAITLIST DEMO (#174) ───────────────────────────────────────────────
  // Public Speaking Confidence (index 22) has maxStudents=2. Fill it with
  // 2 confirmed bookings and add 2 students to the waitlist.
  const publicSpeakingClass = createdClasses[22];
  await db.insert(bookings).values([
    { studentId: student1.id, classId: publicSpeakingClass.id, tutorId: publicSpeakingClass.tutorId, scheduledDate: futureDate, scheduledTime: "17:00", duration: 45, status: "confirmed" },
    { studentId: student2.id, classId: publicSpeakingClass.id, tutorId: publicSpeakingClass.tutorId, scheduledDate: futureDate, scheduledTime: "17:00", duration: 45, status: "confirmed" },
  ]);
  await db.insert(classWaitlist).values([
    { classId: publicSpeakingClass.id, studentId: student3.id, position: 1 },
    { classId: publicSpeakingClass.id, studentId: student4.id, position: 2 },
  ]);

  // ── ADDITIONAL FAVORITES (students 3-5) ────────────────────────────────
  await db.insert(favorites).values([
    { userId: student4.id, classId: createdClasses[18].id }, // Time Management
    { userId: student4.id, classId: createdClasses[25].id }, // French Conversation
    { userId: student5.id, classId: createdClasses[2].id },  // Intro to AI
    { userId: student5.id, classId: createdClasses[9].id },  // Intro to ML
    { userId: student5.id, classId: createdClasses[36].id }, // Entrepreneurship
  ]);

  console.log(`Database seeded successfully with ${createdClasses.length} courses!`);
  console.log("✅ Seeded: lessons, quizzes, assignments, quiz results, submissions, course progress, certificates, notes, discussions, favorites, contacts, peer help, messages, login history, user settings");
}

// ── Incremental backfill: insert quizzes & lessons for existing DBs that were seeded before this data existed ──
async function backfillQuizzesAndLessons() {
  console.log("Backfilling quizzes and lessons for existing database...");

  const { eq } = await import("drizzle-orm");

  // Discover existing seed users and classes
  const [tutor1] = await db.select().from(users).where(eq(users.email, "james@example.com")).limit(1);
  const [student1] = await db.select().from(users).where(eq(users.email, "kofi@example.com")).limit(1);
  const [student2] = await db.select().from(users).where(eq(users.email, "nia@example.com")).limit(1);
  if (!tutor1 || !student1) {
    console.log("⚠️  Backfill skipped: seed users not found.");
    return;
  }

  // Find tutor1's classes by name
  const allClasses = await db.select().from(classes).where(eq(classes.tutorId, tutor1.id));
  const pythonClass = allClasses.find(c => c.title === "Python Programming for Beginners");
  const algebraClass = allClasses.find(c => c.title === "Algebra Made Easy");
  if (!pythonClass || !algebraClass) {
    console.log("⚠️  Backfill skipped: Python/Algebra classes not found.");
    return;
  }

  // Lessons
  const existingLessons = await db.select().from(lessons).limit(1);
  if (existingLessons.length === 0) {
    await db.insert(lessons).values([
      {
        classId: pythonClass.id, tutorId: tutor1.id,
        title: "Introduction to Python & Setup",
        description: "Get your environment ready and write your first Python program.",
        content: "What is Python?||Python is a high-level programming language created by Guido van Rossum in 1991.",
        duration: 30, difficulty: "beginner",
      },
      {
        classId: pythonClass.id, tutorId: tutor1.id,
        title: "Control Flow: if / else / loops",
        description: "Learn how to make decisions and repeat actions in Python.",
        content: "Control flow allows your program to make decisions based on conditions.",
        duration: 35, difficulty: "beginner",
      },
      {
        classId: algebraClass.id, tutorId: tutor1.id,
        title: "Variables and Expressions",
        description: "Understand what algebra variables are and how to form expressions.",
        content: "Algebra uses letters to represent unknown numbers.",
        duration: 25, difficulty: "beginner",
      },
    ]);
    console.log("  ✅ Backfilled lessons");
  }

  // Quizzes
  const [quiz1, quiz2] = await db.insert(quizzes).values([
    {
      classId: pythonClass.id, tutorId: tutor1.id,
      title: "Python Basics Quiz",
      description: "Test your understanding of Python fundamentals.",
      questions: JSON.stringify([
        { question: "What function is used to print output in Python?", options: ["echo()", "console.log()", "print()", "write()"], correctAnswer: 2 },
        { question: "Which data type stores whole numbers in Python?", options: ["float", "int", "str", "bool"], correctAnswer: 1 },
        { question: "What does `len('hello')` return?", options: ["4", "5", "6", "Error"], correctAnswer: 1 },
        { question: "Which keyword starts a function definition in Python?", options: ["function", "def", "func", "define"], correctAnswer: 1 },
        { question: "What is the correct way to write a comment in Python?", options: ["// comment", "/* comment */", "# comment", "<!-- comment -->"], correctAnswer: 2 },
      ]),
      timeLimit: 10, passingScore: 60, maxAttempts: 3,
    },
    {
      classId: algebraClass.id, tutorId: tutor1.id,
      title: "Algebra Variables Quiz",
      description: "Check your understanding of variables and expressions.",
      questions: JSON.stringify([
        { question: "If x = 4, what is 3x + 2?", options: ["10", "12", "14", "16"], correctAnswer: 2 },
        { question: "What does the variable represent in algebra?", options: ["A fixed number", "An unknown value", "A fraction", "An operation"], correctAnswer: 1 },
        { question: "Simplify: 5x + 3x", options: ["8", "8x", "15x", "53x"], correctAnswer: 1 },
        { question: "What is 2 + 3 × 4 using order of operations?", options: ["20", "14", "24", "10"], correctAnswer: 1 },
      ]),
      timeLimit: 8, passingScore: 75, maxAttempts: 2,
    },
  ]).returning();

  // Quiz results
  await db.insert(quizResults).values([
    { quizId: quiz1.id, studentId: student1.id, score: 80, answers: JSON.stringify([2, 1, 1, 1, 0]), passed: true },
    { quizId: quiz2.id, studentId: student1.id, score: 100, answers: JSON.stringify([2, 1, 1, 1]), passed: true },
    ...(student2 ? [{ quizId: quiz1.id, studentId: student2.id, score: 60, answers: JSON.stringify([2, 0, 1, 1, 2]), passed: true }] : []),
  ]);

  console.log("  ✅ Backfilled quizzes and quiz results");
}
