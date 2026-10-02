/**
 * Offline knowledge base for the study assistant (part 1 of 2).
 * Each entry can answer in English and/or Bangla. Deterministic, local, network-free.
 */

export const KNOWLEDGE = [
  {
    id: 'tcpip',
    match: ['tcp', 'tcp/ip', 'tcp ip', 'internet protocol'],
    en: 'TCP/IP in four layers:\n1. Application — HTTP, DNS, SMTP, FTP\n2. Transport — TCP (reliable, ordered) and UDP (fast, connectionless)\n3. Internet — IP addressing and routing\n4. Link — Ethernet, Wi-Fi\n\nTCP is connection-oriented with a 3-way handshake (SYN, SYN-ACK, ACK) and a 4-way teardown. UDP has no handshake and no delivery guarantee.\n\nExam tip: "reliable" = TCP, "fast/streaming/game" = UDP, "addressing/routing" = IP.',
    bn: 'TCP/IP চারটি লেয়ারে বোঝা যায়:\n1. Application — HTTP, DNS, SMTP, FTP\n2. Transport — TCP (নির্ভরযোগ্য, ক্রম বজায় রাখে) ও UDP (দ্রুত, connection ছাড়া)\n3. Internet — IP ঠিকানা ও routing\n4. Link — Ethernet, Wi-Fi\n\nTCP connection-oriented, ৩-ধাপের handshake (SYN, SYN-ACK, ACK)। UDP কোনো handshake নেই এবং delivery নিশ্চিত করে না।\n\nপরীক্ষার টিপস: "reliable" মানে TCP, "fast/streaming" মানে UDP, "addressing/routing" মানে IP।',
  },
  {
    id: 'compiler',
    match: ['compiler', 'compilation', 'lexical', 'parse tree'],
    en: 'Compiler phases in order:\n1. Lexical analysis — source code into tokens\n2. Syntax analysis — tokens into a parse tree (grammar check)\n3. Semantic analysis — meaning and type checks\n4. Intermediate code generation\n5. Code optimisation\n6. Code generation — target assembly\n\nThe symbol table is maintained across all phases. Errors appear in order: lexical, then syntax, then semantic.',
    bn: 'কম্পাইলারের ধাপগুলো ধারাবাহিকভাবে:\n1. Lexical analysis — কোডকে token-এ ভাগ করা\n2. Syntax analysis — grammar যাচাই, parse tree তৈরি\n3. Semantic analysis — অর্থ ও type checking\n4. Intermediate code generation\n5. Code optimisation\n6. Code generation — চূড়ান্ত assembly code\n\nSymbol table প্রতিটি ধাপে ব্যবহার হয়। ভুলের ক্রম: lexical → syntax → semantic।',
  },
  {
    id: 'python',
    match: ['python', 'learn python', 'python plan', 'python roadmap'],
    en: 'A practical Python plan:\nWeek 1 — syntax, data types, control flow, functions, lists/dicts\nWeek 2 — OOP, file handling, JSON, exceptions, virtual environments\nWeek 3 — modules, pip, requests, working with APIs\nWeek 4 — NumPy + Pandas + Matplotlib on one real dataset\nWeek 5 — Git/GitHub: init, commit, branch, push, README\nWeek 6 — build one CLI tool and push it\n\nRule: 60% building, 40% reading. End every week with something you can show.',
    bn: 'বাস্তবসম্মত Python পরিকল্পনা:\nসপ্তাহ ১ — syntax, data type, control flow, function, list/dict\nসপ্তাহ ২ — OOP, file handling, JSON, exception, virtual environment\nসপ্তাহ ৩ — module, pip, requests, API ব্যবহার\nসপ্তাহ ৪ — NumPy + Pandas + Matplotlib দিয়ে একটি dataset\nসপ্তাহ ৫ — Git/GitHub: init, commit, branch, push, README\nসপ্তাহ ৬ — একটি CLI tool বানিয়ে push করো\n\nনিয়ম: ৬০% বানানো, ৪০% পড়া। প্রতি সপ্তাহ শেষে এমন কিছু রাখো যা দেখানো যায়।',
  },
  {
    id: 'ml-viva',
    match: ['viva', 'ml viva', 'machine learning interview'],
    en: 'ML viva essentials:\n1. Supervised vs unsupervised vs reinforcement learning\n2. Regression vs classification — the output type decides\n3. Why split data? Train/validation/test and data leakage\n4. Overfitting vs underfitting and how to spot them\n5. Metrics: accuracy, precision, recall, F1, ROC-AUC and when each matters\n6. Cross-validation vs a single split\n7. Feature engineering and scaling\n8. Bias-variance tradeoff\n\nAnswer in one line each: define it, give an example, give one limitation.',
    bn: 'ML viva-এর জরুরি বিষয়:\n১. Supervised, unsupervised ও reinforcement learning\n২. Regression বনাম classification — output দিয়ে নির্ধারিত\n৩. Data split কেন? Train/validation/test এবং data leakage\n৪. Overfitting বনাম underfitting\n৫. Metrics: accuracy, precision, recall, F1, ROC-AUC\n৬. Cross-validation কেন বেশি ভালো\n৭. Feature engineering ও scaling\n৮. Bias-variance tradeoff\n\nউত্তর দেওয়ার নিয়ম: সংজ্ঞা → উদাহরণ → একটা সীমাবদ্ধতা।',
  },
];


KNOWLEDGE.push(
  {
    id: 'networking-mcq',
    match: ['mcq', 'quiz', 'multiple choice'],
    en: 'Networking MCQ practice:\nQ1. Which protocol is connection-oriented? → TCP\nQ2. Who resolves domain names? → DNS\nQ3. Which layer does IP belong to? → Internet layer\nQ4. How many ports does TCP use? → Two (source, destination)\nQ5. What does TLS provide? → Encryption and authentication\nQ6. How many addresses in a 32-bit space? → 2^32\nQ7. Which device routes between networks? → Router\nQ8. UDP is used by? → DNS, DHCP, live streaming\n\nWrite the reason for each answer, not just the letter.',
    bn: 'নেটওয়ার্কিং MCQ প্র্যাকটিস:\nQ1. কোন প্রোটোকল connection-oriented? → TCP\nQ2. Domain name কে resolve করে? → DNS\nQ3. IP কোন লেয়ারে? → Internet layer\nQ4. TCP কয়টি port ব্যবহার করে? → দুটি\nQ5. TLS কী দেয়? → Encryption ও authentication\nQ6. 32-bit address space কত? → 2^32\nQ7. প্যাকেট route করে? → Router\nQ8. UDP কোথায় ব্যবহার হয়? → DNS, DHCP, live streaming\n\nশুধু অক্ষর নয়, প্রতিটি উত্তরের কারণও লেখো।',
  },
  {
    id: 'os',
    match: ['operating system', 'os concept', 'deadlock', 'scheduling'],
    en: 'OS quick revision:\n- Process vs thread: a process has its own address space; threads share one\n- Scheduling: FCFS, SJF (optimal but needs burst time), Round Robin (fair, time quantum), Priority\n- Deadlock needs all four: mutual exclusion, hold and wait, no preemption, circular wait\n- Virtual memory lets a program exceed RAM using paging\n- Kernel vs user mode protects hardware and memory',
    bn: 'OS দ্রুত পুনরালোচনা:\n- Process বনাম thread: process-এর নিজস্ব address space, thread একই space ভাগ করে\n- Scheduling: FCFS, SJF, Round Robin (সুযোগসমান), Priority\n- Deadlock-এর ৪টি শর্ত: mutual exclusion, hold and wait, no preemption, circular wait\n- Virtual memory RAM-এর চেয়ে বেশি মেমরি ব্যবহার করতে দেয় (paging)\n- Kernel বনাম user mode হার্ডওয়্যার ও মেমরি রক্ষা করে',
  },
  {
    id: 'dbms',
    match: ['dbms', 'database', 'normalization', 'sql', 'join'],
    en: 'DBMS essentials:\n- 1NF atomic values, 2NF no partial dependency, 3NF no transitive dependency\n- INNER JOIN returns matches; LEFT JOIN keeps every left row\n- GROUP BY aggregates; HAVING filters groups, WHERE filters rows\n- Indexes speed reads but slow writes\n- ACID: Atomicity, Consistency, Isolation, Durability',
    bn: 'DBMS মূল বিষয়:\n- 1NF atomic value, 2NF partial dependency নেই, 3NF transitive dependency নেই\n- INNER JOIN শুধু match দেয়, LEFT JOIN বাম দিকের সব row রাখে\n- GROUP BY aggregate করে; HAVING group filter, WHERE row filter\n- Index পড়া দ্রুত করে, লেখা ধীর করে\n- ACID: Atomicity, Consistency, Isolation, Durability',
  },
  {
    id: 'study-method',
    match: ['how to study', 'study method', 'revision', 'memorize', 'remember', 'focus'],
    en: 'A method that works:\n1. Read one small section actively\n2. Close the notes and explain it out loud in your own words\n3. Write 3 questions and answer them without looking\n4. Space it: review after 1 day, 3 days, 7 days\n5. Practise retrieval, not re-reading — re-reading feels good and works badly\n\nFor exams: past questions > summary notes > the full textbook.',
    bn: 'কাজ করে এমন একটি পদ্ধতি:\n১. ছোট একটি অংশ সক্রিয়ভাবে পড়ো\n২. বই বন্ধ করে নিজের ভাষায় বলে বোঝাও\n৩. ৩টি প্রশ্ন লিখে চোখ বন্ধ করে উত্তর দাও\n৪. Spacing: ১ দিন, ৩ দিন, ৭ দিন পরে review\n৫. পুনরায় পড়ার বদলে recall করো\n\nপরীক্ষার জন্য: past questions > summary note > পুরো বই।',
  },
);
