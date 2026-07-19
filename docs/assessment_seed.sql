-- ============================================================
-- Assessment Seed Data — Based on real jobs in hireai_db
-- Run this in MySQL to populate the assessment engine with
-- real data matching the existing jobs.
--
-- Recruiter creating these: user id=22 (role: recruiter)
-- Jobs being assessed: 1 (React), 2 (Node.js), 3 (Full Stack Intern)
-- ============================================================


-- ════════════════════════════════════════════════════════════════
-- ASSESSMENT 1 — Senior React Developer (job_id = 1)
-- ════════════════════════════════════════════════════════════════
INSERT INTO assessments (id, title, description, job_id, time_limit_minutes, created_by)
VALUES (1,
        'Senior React Developer — Technical Screen',
        'Tests React hooks, state management, performance, and component design patterns.',
        1,   -- job_id: Senior React Developer at TechCorp Solutions
        30,
        22   -- created_by: recruiter (user id 22)
);

INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, points) VALUES
(1, 'Which hook would you use to avoid re-creating an expensive object on every render?',
 'mcq',
 '["useState","useEffect","useMemo","useCallback"]',
 'useMemo', 10),

(1, 'What is the correct way to update an object inside useState without mutating it?',
 'mcq',
 '["setState(obj.key = val)","setState({...prev, key: val})","setState(Object.assign(obj))","setState(obj)"]',
 'setState({...prev, key: val})', 10),

(1, 'What does React.memo do?',
 'mcq',
 '["Memoizes the return value of a function","Prevents a component re-rendering if props have not changed","Caches API responses","Stores values between renders"]',
 'Prevents a component re-rendering if props have not changed', 10),

(1, 'When does useEffect with an empty dependency array [] run?',
 'mcq',
 '["On every render","Only once after the first render","Every time state changes","Never"]',
 'Only once after the first render', 10),

(1, 'What is the purpose of the cleanup function returned from useEffect?',
 'mcq',
 '["To run logic on component mount","To cancel subscriptions or timers before the component unmounts","To reset state","To fetch data"]',
 'To cancel subscriptions or timers before the component unmounts', 10);


-- ════════════════════════════════════════════════════════════════
-- ASSESSMENT 2 — Node.js Backend Engineer (job_id = 2)
-- ════════════════════════════════════════════════════════════════
INSERT INTO assessments (id, title, description, job_id, time_limit_minutes, created_by)
VALUES (2,
        'Node.js Backend Engineer — Technical Screen',
        'Tests Express.js, async/await, REST API design, middleware, and error handling.',
        2,   -- job_id: Node.js Backend Engineer at FinFlow Technologies
        30,
        22
);

INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, points) VALUES
(2, 'What does the next() function do inside Express middleware?',
 'mcq',
 '["Sends the response","Passes control to the next middleware or route handler","Closes the server","Restarts the request"]',
 'Passes control to the next middleware or route handler', 10),

(2, 'Which HTTP status code should you return when a resource is successfully created?',
 'mcq',
 '["200","204","201","400"]',
 '201', 10),

(2, 'What is the difference between async/await and .then() in JavaScript?',
 'mcq',
 '["They are completely different features","async/await is syntactic sugar over Promises making code look synchronous","async/await is faster","Promises are newer than async/await"]',
 'async/await is syntactic sugar over Promises making code look synchronous', 10),

(2, 'In Express, where should error-handling middleware be placed?',
 'mcq',
 '["Before all other middleware","After routes, at the end of the middleware stack","Inside each route handler","At the top of app.js"]',
 'After routes, at the end of the middleware stack', 10),

(2, 'What does app.use(express.json()) do?',
 'mcq',
 '["Enables CORS","Parses incoming JSON request bodies into req.body","Sends JSON responses","Validates JSON data"]',
 'Parses incoming JSON request bodies into req.body', 10);


-- ════════════════════════════════════════════════════════════════
-- ASSESSMENT 3 — Full Stack Intern (job_id = 3)
-- ════════════════════════════════════════════════════════════════
INSERT INTO assessments (id, title, description, job_id, time_limit_minutes, created_by)
VALUES (3,
        'Full Stack Intern — Fundamentals Check',
        'A beginner-friendly quiz on HTML, CSS, JavaScript, and basic React concepts.',
        3,   -- job_id: Full Stack Intern at StartupNest
        20,
        22
);

INSERT INTO questions (assessment_id, question_text, question_type, options, correct_answer, points) VALUES
(3, 'What does HTML stand for?',
 'mcq',
 '["Hyper Text Markup Language","High Tech Modern Language","Hyperlink and Text Markup Language","Home Tool Markup Language"]',
 'Hyper Text Markup Language', 5),

(3, 'Which CSS property is used to change the text colour?',
 'mcq',
 '["font-color","text-color","color","foreground-color"]',
 'color', 5),

(3, 'What is the output of: console.log(typeof null)?',
 'mcq',
 '["null","undefined","object","string"]',
 'object', 10),

(3, 'In React, what is JSX?',
 'mcq',
 '["A database query language","A styling framework","A syntax extension that lets you write HTML-like code inside JavaScript","A testing library"]',
 'A syntax extension that lets you write HTML-like code inside JavaScript', 10),

(3, 'Which hook manages local state in a React component?',
 'mcq',
 '["useEffect","useContext","useReducer","useState"]',
 'useState', 10);
