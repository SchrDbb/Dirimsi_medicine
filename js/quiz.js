// js/quiz.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import biology questions from the new dedicated file
import { biologyQuestions } from './biology_mcq.js';

// Global Firebase variables, initialized from the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app = null;
let auth = null;
let db = null;
let userId = null;
let profileDocRef = null;
let userIsAuthenticated = false;
let isFirebaseInitialized = false;

// Audio for correct and incorrect answers (subtle, professional tones)
const correctSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568.wav'); // Soft chime
const incorrectSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569.wav'); // Soft error chime

// --- Centralized Quiz Question Data Storage ---
// This object will hold all questions, organized by subject and then by topic.
const ALL_QUIZ_QUESTIONS = {
    // For "course" type quizzes
    course: {
        biology: biologyQuestions, // Now dynamically loaded from biology_mcq.js
        chemistry: {
            // Placeholder for chemistry topics. You'd load this from a chemistry_mcq.js
            "basic-concepts": [
                { question: "What is the chemical symbol for Oxygen?", options: ["O", "Ox", "Om", "Oy"], correctAnswer: "O", explanation: "Oxygen's symbol is 'O'." },
                { question: "Which type of bond involves the sharing of electron pairs between atoms?", options: ["Ionic bond", "Metallic bond", "Covalent bond", "Hydrogen bond"], correctAnswer: "Covalent bond", explanation: "Covalent bonds involve the sharing of electrons, typically between non-metals." },
            ]
        },
        anatomy: { // Anatomy questions from your original quiz.js, kept here for demonstration.
                   // NOTE: You'll need to add explanations to these if you want them for anatomy quizzes.
            "brachial-plexus": [
                { question: "The brachial plexus is primarily formed by the anterior primary rami of which spinal nerves?", options: ["C1-C4", "C5-T1", "T1-T5", "L1-L5"], correctAnswer: "C5-T1", explanation: "The brachial plexus is a network of nerves formed by the anterior rami of cervical spinal nerves C5, C6, C7, C8, and thoracic spinal nerve T1." },
                { question: "Which anatomical landmark do the roots of the brachial plexus emerge between?", options: ["Pectoralis Major and Minor", "Sternocleidomastoid and Trapezius", "Anterior and Middle Scalene Muscles", "Clavicle and First Rib"], correctAnswer: "Anterior and Middle Scalene Muscles", explanation: "The roots of the brachial plexus pass between the anterior and middle scalene muscles in the neck." },
                { question: "An upper brachial plexus injury (Erb's Palsy) typically involves nerve roots:", options: ["C8-T1", "C7-C8", "C5-C6", "T1-T2"], correctAnswer: "C5-C6", explanation: "Erb's Palsy is an injury to the upper brachial plexus, commonly affecting the C5 and C6 nerve roots, leading to paralysis of specific arm muscles." },
                { question: "Which terminal branch of the brachial plexus innervates the deltoid and teres minor muscles?", options: ["Musculocutaneous nerve", "Median nerve", "Axillary nerve", "Radial nerve"], correctAnswer: "Axillary nerve", explanation: "The axillary nerve, a terminal branch of the posterior cord of the brachial plexus, supplies the deltoid and teres minor muscles." },
            ],
            "radial-nerve": [
                { question: "Which of the following muscles is primarily innervated by the radial nerve?", options: ["Biceps brachii", "Flexor Carpi Ulnaris", "Triceps brachii", "Pronator Teres"], correctAnswer: "Triceps brachii", explanation: "The radial nerve innervates the triceps brachii muscle, which is responsible for extension of the forearm." },
                { question: "Injury to the radial nerve in the mid-arm (e.g., 'Saturday night palsy') typically results in:", options: ["Wrist drop", "Claw hand", "Winged scapula", "Foot drop"], correctAnswer: "Wrist drop", explanation: "'Saturday night palsy' is a common term for radial nerve compression, often leading to wrist drop due to paralysis of wrist and finger extensors." },
            ],
            "wrist": [
                { question: "How many carpal bones are there in the human wrist?", options: ["6", "7", "8", "9"], correctAnswer: "8", explanation: "There are eight carpal bones in the wrist, arranged in two rows of four bones each." },
                { question: "Which carpal bone is most commonly fractured?", options: ["Lunate", "Triquetrum", "Scaphoid", "Capitate"], correctAnswer: "Scaphoid", explanation: "The scaphoid bone is the most frequently fractured carpal bone, often due to a fall onto an outstretched hand." },
            ],
            "carpal-tunnel": [
                { question: "Which nerve passes through the carpal tunnel?", options: ["Ulnar nerve", "Radial nerve", "Median nerve", "Axillary nerve"], correctAnswer: "Median nerve", explanation: "The median nerve, along with several tendons, passes through the carpal tunnel in the wrist." },
                { question: "Carpal Tunnel Syndrome is often caused by compression of which nerve?", options: ["Ulnar nerve", "Radial nerve", "Median nerve", "Axillary nerve"], correctAnswer: "Median nerve", explanation: "Carpal Tunnel Syndrome results from compression of the median nerve as it passes through the carpal tunnel." },
            ],
            "shoulder": [
                { question: "Which muscle is part of the rotator cuff?", options: ["Deltoid", "Pectoralis Major", "Latissimus Dorsi", "Supraspinatus"], correctAnswer: "Supraspinatus", explanation: "The rotator cuff is a group of four muscles: supraspinatus, infraspinatus, teres minor, and subscapularis, which stabilize the shoulder joint." },
                { question: "What type of joint is the glenohumeral joint?", options: ["Hinge", "Pivot", "Ball and socket", "Condyloid"], correctAnswer: "Ball and socket", explanation: "The glenohumeral joint (shoulder joint) is a ball-and-socket joint, allowing for a wide range of motion." },
            ],
            "hip-joint": [
                { question: "The head of the femur articulates with which part of the pelvis?", options: ["Ischium", "Pubis", "Acetabulum", "Ilium"], correctAnswer: "Acetabulum", explanation: "The head of the femur fits into the acetabulum of the hip bone, forming the hip joint." },
                { question: "Which nerve is most at risk of injury during a posterior hip dislocation?", options: ["Femoral nerve", "Obturator nerve", "Sciatic nerve", "Superior gluteal nerve"], correctAnswer: "Sciatic nerve", explanation: "The sciatic nerve is closely associated with the posterior aspect of the hip joint and is highly vulnerable to injury during posterior dislocations." },
            ],
            "knee-joint": [
                { question: "Which ligament prevents anterior displacement of the tibia relative to the femur?", options: ["PCL", "MCL", "LCL", "ACL"], correctAnswer: "ACL", explanation: "The Anterior Cruciate Ligament (ACL) prevents the tibia from sliding too far forward on the femur." },
                { question: "The medial and lateral menisci of the knee joint are primarily involved in:", options: ["Producing synovial fluid", "Increasing joint stability and shock absorption", "Anchoring patella", "Facilitating rotation"], correctAnswer: "Increasing joint stability and shock absorption", explanation: "The menisci are C-shaped cartilages that deepen the tibial plateau, improving stability and absorbing shock during knee movements." },
            ],
            "common-fibular-nerve-injury": [
                { question: "Injury to the common fibular (peroneal) nerve can result in what clinical presentation?", options: ["Foot drop", "Claw toe", "Pes cavus", "Heel pain"], correctAnswer: "Foot drop", explanation: "The common fibular nerve innervates muscles that dorsiflex the foot and evert the ankle. Damage leads to weakness in these movements, causing foot drop." },
                { question: "The common fibular nerve is a branch of which larger nerve?", options: ["Femoral nerve", "Obturator nerve", "Sciatic nerve", "Tibial nerve"], correctAnswer: "Sciatic nerve", explanation: "The common fibular nerve is one of the two main terminal branches of the sciatic nerve in the thigh." },
            ],
            "deep-venous-thrombosis": [
                { question: "Which vein is commonly involved in Deep Venous Thrombosis (DVT) in the lower limb?", options: ["Great Saphenous Vein", "Femoral Vein", "Popliteal Artery", "Anterior Tibial Vein"], correctAnswer: "Femoral Vein", explanation: "DVT commonly occurs in the deep veins of the leg and thigh, with the femoral vein being a frequent site." },
                { question: "A common complication of DVT is:", options: ["Peripheral Artery Disease", "Varicose Veins", "Pulmonary Embolism", "Lymphedema"], correctAnswer: "Pulmonary Embolism", explanation: "A pulmonary embolism (PE) occurs when a piece of a DVT breaks off and travels to the lungs, blocking a pulmonary artery." },
            ],
            "achilles-tendon-rupture": [
                { question: "The Achilles tendon is formed by the tendons of which muscles?", options: ["Quadriceps femoris", "Hamstrings", "Gastrocnemius and Soleus", "Tibialis Anterior"], correctAnswer: "Gastrocnemius and Soleus", explanation: "The Achilles (calcaneal) tendon is formed by the union of the gastrocnemius and soleus muscles, attaching to the calcaneus." },
                { question: "A complete rupture of the Achilles tendon would primarily affect which movement?", options: ["Dorsiflexion of the ankle", "Inversion of the foot", "Plantarflexion of the ankle", "Eversion of the foot"], correctAnswer: "Plantarflexion of the ankle", explanation: "The gastrocnemius and soleus muscles are the primary plantarflexors of the ankle, so their tendon's rupture severely impairs this movement." },
            ],
            "superior-vena-cava-syndrome": [
                { question: "The superior vena cava (SVC) is formed by the union of which two veins?", options: ["Internal jugular veins", "External jugular veins", "Brachiocephalic veins", "Subclavian veins"], correctAnswer: "Brachiocephalic veins", explanation: "The SVC is formed by the junction of the right and left brachiocephalic veins behind the lower border of the first right costal cartilage." },
                { question: "Compression of the SVC (SVC syndrome) commonly leads to swelling in which part of the body?", options: ["Lower limbs", "Abdomen", "Face and upper limbs", "Scrotum"], correctAnswer: "Face and upper limbs", explanation: "SVC syndrome results from obstruction of the superior vena cava, impairing venous return from the head, neck, and upper extremities." },
            ],
            "breast-cancer": [
                { question: "Which group of lymph nodes is typically the first site of metastasis for breast cancer?", options: ["Cervical lymph nodes", "Inguinal lymph nodes", "Axillary lymph nodes", "Supraclavicular lymph nodes"], correctAnswer: "Axillary lymph nodes", explanation: "Axillary lymph nodes are the primary drainage site for breast lymph, making them a common first site for metastatic spread." },
                { question: "The 'tail of Spence' refers to a portion of the breast that extends into which region?", options: ["Sternal", "Inframammary", "Axillary", "Clavicular"], correctAnswer: "Axillary", explanation: "The Tail of Spence, or axillary tail, is an extension of the breast tissue into the axilla (armpit)." },
            ],
            "atrial-fibrillation-mitral-stenosis": [
                { question: "The SA node (sinoatrial node) is commonly known as the pacemaker of the heart. Where is it located?", options: ["Left atrium", "Right ventricle", "Right atrium", "Interventricular septum"], correctAnswer: "Right atrium", explanation: "The SA node is located in the upper posterior wall of the right atrium, initiating the electrical impulses that cause the heart to beat." },
                { question: "Mitral stenosis involves the narrowing of the valve between which two heart chambers?", options: ["Right atrium and right ventricle", "Left atrium and left ventricle", "Right ventricle and pulmonary artery", "Left ventricle and aorta"], correctAnswer: "Left atrium and left ventricle", explanation: "The mitral valve (bicuspid valve) is located between the left atrium and left ventricle. Stenosis refers to its narrowing." },
            ],
            "pulmonary-embolism": [
                { question: "A pulmonary embolism typically involves a blockage in which blood vessels?", options: ["Pulmonary arteries", "Bronchial arteries", "Aorta", "Coronary arteries"], correctAnswer: "Pulmonary arteries", explanation: "A pulmonary embolism is a blockage in one of the pulmonary arteries in the lungs, most often caused by blood clots that travel from the legs." },
                { question: "What is the primary function of the pulmonary arteries?", options: ["Carry oxygenated blood to the lungs", "Carry deoxygenated blood to the lungs", "Carry oxygenated blood to the body", "Carry deoxygenated blood to the heart"], correctAnswer: "Carry deoxygenated blood to the lungs", explanation: "Pulmonary arteries are unique in that they carry deoxygenated blood from the right ventricle of the heart to the lungs for oxygenation." },
            ],
            "pneumothorax": [
                { question: "A pneumothorax is the presence of air in which anatomical space?", options: ["Pericardial cavity", "Mediastinum", "Pleural cavity", "Peritoneal cavity"], correctAnswer: "Pleural cavity", explanation: "A pneumothorax is a collapsed lung, occurring when air leaks into the space between your lung and chest wall (pleural cavity)." },
                { question: "Which structure separates the pleural cavity from the mediastinum?", options: ["Diaphragm", "Sternum", "Ribs", "None, they are continuous"], correctAnswer: "None, they are continuous", explanation: "The mediastinum is the central compartment of the thoracic cavity, and the pleural cavities (containing the lungs) lie on either side. There isn't a direct separating structure at all points; they are adjacent compartments within the thorax." }, // Tricky, but true in a sense as mediastinum is central
            ],
            "coronary-artery-disease": [
                { question: "Which artery supplies the majority of the blood to the left ventricle?", options: ["Right Coronary Artery", "Left Anterior Descending Artery", "Circumflex Artery", "Marginal Artery"], correctAnswer: "Left Anterior Descending Artery", explanation: "The Left Anterior Descending (LAD) artery, also known as the 'widowmaker,' supplies a large portion of the left ventricle and interventricular septum." },
                { question: "Coronary arteries arise directly from which large artery?", options: ["Pulmonary Artery", "Aorta", "Superior Vena Cava", "Inferior Vena Cava"], correctAnswer: "Aorta", explanation: "The coronary arteries branch off directly from the ascending aorta, supplying blood to the heart muscle itself." },
            ],
            "inferior-epigastric-artery": [
                { question: "The inferior epigastric artery is a branch of which major artery?", options: ["External iliac artery", "Internal iliac artery", "Femoral artery", "Common iliac artery"], correctAnswer: "External iliac artery", explanation: "The inferior epigastric artery arises from the external iliac artery just above the inguinal ligament." },
                { question: "The inferior epigastric artery is an important landmark for identifying which type of inguinal hernia?", options: ["Direct inguinal hernia", "Indirect inguinal hernia", "Femoral hernia", "Umbilical hernia"], correctAnswer: "Indirect inguinal hernia", explanation: "Indirect inguinal hernias occur lateral to the inferior epigastric artery, while direct hernias occur medial to it (through Hesselbach's triangle)." },
            ],
            "inguinal-hernia": [
                { question: "A direct inguinal hernia protrudes through which anatomical structure?", options: ["Deep inguinal ring", "Superficial inguinal ring", "Hesselbach's triangle", "Femoral canal"], correctAnswer: "Hesselbach's triangle", explanation: "Direct inguinal hernias bulge directly through the posterior wall of the inguinal canal, an area known as Hesselbach's triangle." },
                { question: "In males, the spermatic cord passes through which canal?", options: ["Femoral canal", "Inguinal canal", "Obturator canal", "Adductor canal"], correctAnswer: "Inguinal canal", explanation: "The spermatic cord (in males) and round ligament (in females) pass through the inguinal canal." },
            ],
            "gallstones": [
                { question: "The gallbladder's primary function is to store and concentrate:", options: ["Gastric acid", "Pancreatic enzymes", "Bile", "Insulin"], correctAnswer: "Bile", explanation: "The gallbladder stores and concentrates bile, which is produced by the liver and aids in fat digestion." },
                { question: "Which duct directly carries bile from the gallbladder?", options: ["Common Hepatic Duct", "Common Bile Duct", "Cystic Duct", "Pancreatic Duct"], correctAnswer: "Cystic Duct", explanation: "The cystic duct connects the gallbladder to the common hepatic duct, forming the common bile duct." },
            ],
            "small-bowel-mesenteric-angina": [
                { question: "Which artery primarily supplies the small intestine (duodenum, jejunum, ileum)?", options: ["Inferior Mesenteric Artery", "Celiac Trunk", "Superior Mesenteric Artery", "Renal Artery"], correctAnswer: "Superior Mesenteric Artery", explanation: "The Superior Mesenteric Artery (SMA) supplies the distal duodenum, jejunum, ileum, ascending colon, and proximal two-thirds of the transverse colon." },
                { question: "Mesenteric ischemia, or 'bowel angina,' typically presents with pain that is:", options: ["Relieved by eating", "Worsened by eating", "Constant and unrelated to meals", "Relieved by defecation"], correctAnswer: "Worsened by eating", explanation: "Mesenteric angina is pain, usually after meals, caused by insufficient blood flow to the intestines, similar to angina in the heart." },
            ],
            "acute-appendicitis": [
                { question: "The appendix is typically attached to which part of the large bowel?", options: ["Transverse colon", "Descending colon", "Sigmoid colon", "Cecum"], correctAnswer: "Cecum", explanation: "The vermiform appendix is a small, finger-shaped appendage that projects from the large intestinal cecum." },
                { question: "McBurney's point is a common anatomical landmark for diagnosing pain associated with:", options: ["Gallstones", "Kidney stones", "Appendicitis", "Pancreatitis"], correctAnswer: "Appendicitis", explanation: "McBurney's point is a clinical landmark (one-third of the way from the anterior superior iliac spine to the umbilicus) highly indicative of acute appendicitis when tenderness is present." },
            ],
            "pancreatitis": [
                { question: "The pancreas has both endocrine and exocrine functions. Which hormone is produced by its endocrine function?", options: ["Gastrin", "Secretin", "Insulin", "Cholecystokinin"], correctAnswer: "Insulin", explanation: "Insulin is a hormone produced by the beta cells of the pancreatic islets (endocrine function) that regulates blood glucose." },
                { question: "The head of the pancreas is closely related to which part of the small intestine?", options: ["Jejunum", "Ileum", "Duodenum", "Sigmoid colon"], correctAnswer: "Duodenum", explanation: "The head of the pancreas lies within the C-shaped curve of the duodenum." },
            ],
            "cirrhosis": [
                { question: "Cirrhosis is characterized by chronic liver damage leading to replacement of normal liver tissue with:", options: ["Fat", "Scar tissue (fibrosis)", "Cysts", "Tumors"], correctAnswer: "Scar tissue (fibrosis)", explanation: "Cirrhosis is a late stage of scarring (fibrosis) of the liver caused by various liver diseases and conditions, such as hepatitis and chronic alcoholism." },
                { question: "The portal triad consists of the hepatic artery, portal vein, and which other structure?", options: ["Hepatic vein", "Common bile duct", "Cystic duct", "Inferior vena cava"], correctAnswer: "Common bile duct", explanation: "The portal triad consists of the hepatic artery proper, hepatic portal vein, and common bile duct." },
            ],
            "peptic-ulcer-disease": [
                { question: "Which bacteria is a common cause of peptic ulcer disease?", options: ["E. coli", "Salmonella", "Staphylococcus aureus", "Helicobacter pylori"], correctAnswer: "Helicobacter pylori", explanation: "Helicobacter pylori (H. pylori) infection is a major cause of peptic ulcers." },
                { question: "The lesser curvature of the stomach is supplied by branches of which artery?", options: ["Gastroduodenal artery", "Splenic artery", "Left and Right Gastric Arteries", "Gastro-omental artery"], correctAnswer: "Left and Right Gastric Arteries", explanation: "The lesser curvature of the stomach receives blood supply from the left and right gastric arteries." },
            ],
            "perinephric-abscess": [
                { question: "The kidneys are located in which anatomical space?", options: ["Intraperitoneal", "Retroperitoneal", "Pelvic", "Thoracic"], correctAnswer: "Retroperitoneal", explanation: "The kidneys are retroperitoneal organs, meaning they are located behind the peritoneum, against the posterior abdominal wall." },
                { question: "Which major artery supplies blood to the kidneys?", options: ["Superior mesenteric artery", "Renal artery", "Inferior mesenteric artery", "Celiac trunk"], correctAnswer: "Renal artery", explanation: "The renal arteries, direct branches of the aorta, supply blood to the kidneys." },
            ],
            "suprarenal-gland-tumor": [
                { question: "The suprarenal (adrenal) glands are located superior to which organs?", options: ["Spleen", "Liver", "Kidneys", "Pancreas"], correctAnswer: "Kidneys", explanation: "The adrenal glands sit atop the kidneys." },
                { question: "Which layer of the adrenal cortex produces cortisol?", options: ["Zona glomerulosa", "Zona fasciculata", "Zona reticularis", "Adrenal medulla"], correctAnswer: "Zona fasciculata", explanation: "The zona fasciculata, the thickest layer of the adrenal cortex, produces glucocorticoids like cortisol." },
            ],
            "greater-vestibular-bartholin-gland-abscess": [
                { question: "The Bartholin glands are located in the:", options: ["Vagina", "Uterus", "Labia majora", "Labia minora"], correctAnswer: "Labia majora", explanation: "Bartholin's glands are located on each side of the vaginal opening, posterior to the labia majora." },
                { question: "The primary function of the Bartholin glands is to:", options: ["Produce hormones", "Lubricate the vulva", "Produce ova", "Filter waste"], correctAnswer: "Lubricate the vulva", explanation: "Bartholin's glands secrete mucus to lubricate the vulva during sexual arousal." },
            ],
            "testicular-cancer": [
                { question: "The most common type of testicular cancer arises from which cells?", options: ["Leydig cells", "Sertoli cells", "Germ cells", "Stromal cells"], correctAnswer: "Germ cells", explanation: "Over 90% of testicular cancers are germ cell tumors, originating from the sperm-producing cells." },
                { question: "The testes descend through which canal during development?", options: ["Femoral canal", "Inguinal canal", "Obturator canal", "Adductor canal"], correctAnswer: "Inguinal canal", explanation: "During fetal development, the testes descend from the abdominal cavity into the scrotum via the inguinal canal." },
            ],
            "metastatic-cervical-cancer-with-ureter-obstruction": [
                { question: "Which ligament provides lateral support to the uterus and contains the uterine artery?", options: ["Round ligament", "Broad ligament", "Cardinal (transverse cervical) ligament", "Uterosacral ligament"], correctAnswer: "Cardinal (transverse cervical) ligament", explanation: "The cardinal ligaments (transverse cervical ligaments) are at the base of the broad ligament and provide significant support to the uterus, also containing the uterine artery." },
                { question: "Ureteric obstruction due to advanced cervical cancer typically occurs where the ureter crosses which major artery?", options: ["External iliac artery", "Internal iliac artery", "Uterine artery", "Ovarian artery"], correctAnswer: "Uterine artery", explanation: "The ureter passes directly inferior to the uterine artery as it travels towards the bladder, making it vulnerable to compression by cervical cancer spread." },
            ],
            "ectopic-pregnancy": [
                { question: "The most common site for an ectopic pregnancy is the:", options: ["Uterus", "Ovary", "Abdominal cavity", "Fallopian tube"], correctAnswer: "Fallopian tube", explanation: "Approximately 95% of ectopic pregnancies occur in the fallopian tube (tubal pregnancy)." },
                { question: "Which hormone is elevated in pregnancy and used to detect it?", options: ["Estrogen", "Progesterone", "Human Chorionic Gonadotropin (hCG)", "Luteinizing Hormone (LH)"], correctAnswer: "Human Chorionic Gonadotropin (hCG)", explanation: "Human Chorionic Gonadotropin (hCG) is a hormone produced by the placenta after implantation and is the basis for most pregnancy tests." },
            ],
            "benign-prostatic-hyperplasia": [
                { question: "Benign Prostatic Hyperplasia (BPH) primarily affects which zone of the prostate gland?", options: ["Peripheral zone", "Central zone", "Transition zone", "Anterior fibromuscular stroma"], correctAnswer: "Transition zone", explanation: "BPH typically originates in the transition zone of the prostate, which surrounds the urethra." },
                { question: "BPH symptoms are often due to compression of which structure?", options: ["Rectum", "Seminal vesicle", "Urethra", "Vas deferens"], correctAnswer: "Urethra", explanation: "As the prostate enlarges due to BPH, it compresses the urethra, leading to urinary symptoms." },
            ],
            "ureteral-injury-at-surgery": [
                { question: "The ureters transport urine from the kidneys to which organ?", options: ["Bladder", "Urethra", "Rectum", "Gallbladder"], correctAnswer: "Bladder", explanation: "The ureters are tubes that carry urine from the kidneys to the urinary bladder." },
                { question: "During pelvic surgery, the ureter is commonly at risk of injury where it passes close to which uterine structure in females?", options: ["Fundus", "Cervix", "Fallopian tube", "Ovary"], correctAnswer: "Cervix", explanation: "The ureter passes very close to the uterine cervix during its course to the bladder, making it susceptible to injury during hysterectomy and other pelvic surgeries." },
            ],
            "prolapsed-lumbar-nucleus-pulposus": [
                { question: "A 'slipped disc' or herniated disc commonly involves the protrusion of which part of the intervertebral disc?", options: ["Annulus fibrosus", "Nucleus pulposus", "Vertebral body", "Lamina"], correctAnswer: "Nucleus pulposus", explanation: "A herniated disc occurs when the soft, jelly-like center (nucleus pulposus) pushes through a tear in the tougher exterior (annulus fibrosus)." },
                { question: "The most common site for a lumbar disc herniation is between which vertebral levels?", options: ["L1-L2", "L3-L4", "L4-L5 and L5-S1", "C5-C6"], correctAnswer: "L4-L5 and L5-S1", explanation: "The L4-L5 and L5-S1 levels are the most common sites for lumbar disc herniations due to high mechanical stress." },
            ],
            "herpes-zoster": [
                { question: "Herpes Zoster (shingles) is a reactivation of which virus?", options: ["Herpes Simplex Virus", "Epstein-Barr Virus", "Varicella-Zoster Virus", "Cytomegalovirus"], correctAnswer: "Varicella-Zoster Virus", explanation: "Shingles is caused by the reactivation of the varicella-zoster virus (VZV), the same virus that causes chickenpox." },
                { question: "The characteristic rash of Herpes Zoster follows a dermatomal pattern, which corresponds to the distribution of which nerves?", options: ["Cranial nerves", "Autonomic nerves", "Spinal nerves", "Peripheral nerves"], correctAnswer: "Spinal nerves", explanation: "The shingles rash typically follows a dermatome, an area of skin supplied by a single spinal nerve." },
            ],
            "meningitis": [
                { question: "Meningitis is an inflammation of the meninges. Which are the three layers of the meninges from outermost to innermost?", options: ["Pia, arachnoid, dura", "Dura, pia, arachnoid", "Dura, arachnoid, pia", "Arachnoid, dura, pia"], correctAnswer: "Dura, arachnoid, pia", explanation: "The meninges consist of three layers: dura mater (outermost), arachnoid mater (middle), and pia mater (innermost)." },
                { question: "Cerebrospinal fluid (CSF) is produced in which part of the brain?", options: ["Cerebellum", "Brainstem", "Ventricles", "Thalamus"], correctAnswer: "Ventricles", explanation: "Cerebrospinal fluid (CSF) is produced by the choroid plexuses within the ventricles of the brain." },
            ],
            "recurrent-laryngeal-nerve-injury": [
                { question: "The recurrent laryngeal nerve is a branch of which cranial nerve?", options: ["Vagus nerve (CN X)", "Glossopharyngeal nerve (CN IX)", "Hypoglossal nerve (CN XII)", "Facial nerve (CN VII)"], correctAnswer: "Vagus nerve (CN X)", explanation: "The recurrent laryngeal nerve is a critical branch of the vagus nerve (Cranial Nerve X), responsible for innervating most of the laryngeal muscles." },
                { question: "Injury to the recurrent laryngeal nerve typically causes dysfunction of which structure?", options: ["Tongue", "Pharynx", "Larynx (vocal cords)", "Esophagus"], correctAnswer: "Larynx (vocal cords)", explanation: "Damage to the recurrent laryngeal nerve commonly results in vocal cord paralysis, leading to hoarseness or difficulty speaking." },
            ],
            "carotid-insufficiency": [
                { question: "The common carotid artery typically bifurcates into the internal and external carotid arteries at the level of which cervical vertebra?", options: ["C2", "C3", "C4", "C6"], correctAnswer: "C4", explanation: "The common carotid artery usually divides into its internal and external branches at the level of the C4 vertebra (upper border of the thyroid cartilage)." },
                { question: "Carotid insufficiency often leads to symptoms related to reduced blood flow to the:", options: ["Heart", "Lungs", "Brain", "Kidneys"], correctAnswer: "Brain", explanation: "Carotid arteries supply blood to the brain. Insufficiency means reduced blood flow to the brain, leading to neurological symptoms like stroke or TIA." },
            ],
            "torticollis": [
                { question: "Congenital torticollis is most commonly associated with a contracture of which neck muscle?", options: ["Trapezius", "Platysma", "Sternocleidomastoid", "Splenius Capitis"], correctAnswer: "Sternocleidomastoid", explanation: "Congenital muscular torticollis (CMT) is characterized by shortening or fibrosis of the sternocleidomastoid muscle." },
                { question: "The sternocleidomastoid muscle divides the neck into which two main triangles?", options: ["Anterior and Posterior", "Superior and Inferior", "Medial and Lateral", "None of the above"], correctAnswer: "Anterior and Posterior", explanation: "The sternocleidomastoid muscle serves as a key anatomical landmark, dividing the neck into anterior and posterior triangles." },
            ],
            "metastatic-scalene-node": [
                { question: "The scalene lymph nodes are located in which region of the body?", options: ["Axilla", "Groin", "Neck", "Mediastinum"], correctAnswer: "Neck", explanation: "The scalene lymph nodes are located in the supraclavicular fossa of the neck, deep to the clavicle." },
                { question: "Enlargement of a supraclavicular (Virchow's) node, which can be a metastatic scalene node, is often indicative of malignancy originating from which common abdominal organ?", options: ["Spleen", "Appendix", "Stomach", "Kidney"], correctAnswer: "Stomach", explanation: "An enlarged left supraclavicular lymph node (Virchow's node) is a classic sign of metastasis from abdominal cancers, most commonly gastric cancer." },
            ],
            "bell-palsy": [
                { question: "Bell's Palsy is an idiopathic paralysis of which cranial nerve?", options: ["Trigeminal nerve (CN V)", "Abducens nerve (CN VI)", "Facial nerve (CN VII)", "Vestibulocochlear nerve (CN VIII)"], correctAnswer: "Facial nerve (CN VII)", explanation: "Bell's Palsy is a sudden, temporary weakness or paralysis of the facial muscles, caused by inflammation or damage to the facial nerve (Cranial Nerve VII)." },
                { question: "Which side of the face is typically affected in Bell's Palsy?", options: ["Both sides symmetrically", "Contralateral side", "Ipsilateral side", "Lower half only"], correctAnswer: "Ipsilateral side", explanation: "Bell's Palsy typically affects only one side of the face (ipsilateral), causing drooping and difficulty with facial expressions on that side." },
            ],
            "trigeminal-neuralgia": [
                { question: "Trigeminal neuralgia affects which cranial nerve?", options: ["CN V", "CN VII", "CN IX", "CN X"], correctAnswer: "CN V", explanation: "Trigeminal neuralgia is a chronic pain condition affecting the trigeminal nerve (Cranial Nerve V), which carries sensation from your face to your brain." },
                { question: "Pain in trigeminal neuralgia is typically described as:", options: ["Dull and constant", "Burning and migratory", "Sharp, shooting, and electric-shock like", "Throbbing with associated nausea"], correctAnswer: "Sharp, shooting, and electric-shock like", explanation: "The pain of trigeminal neuralgia is classically described as severe, sudden, shock-like, or stabbing pain in the face." },
            ],
            "oculomotor-nerve-palsy": [
                { question: "The oculomotor nerve (CN III) innervates most of the extraocular muscles. Which muscle is NOT innervated by the oculomotor nerve?", options: ["Superior rectus", "Inferior oblique", "Lateral rectus", "Medial rectus"], correctAnswer: "Lateral rectus", explanation: "The oculomotor nerve (CN III) innervates the superior rectus, inferior rectus, medial rectus, and inferior oblique muscles. The lateral rectus is innervated by the abducens nerve (CN VI), and the superior oblique by the trochlear nerve (CN IV)." },
                { question: "Oculomotor nerve palsy can lead to ptosis, which is:", options: ["Double vision", "Inability to move the eye laterally", "Drooping of the eyelid", "Dilated pupil"], correctAnswer: "Drooping of the eyelid", explanation: "Ptosis, or drooping of the upper eyelid, is a common sign of oculomotor nerve palsy due to paralysis of the levator palpebrae superioris muscle." },
            ],
            "cephalohematoma": [
                { question: "A cephalohematoma is a collection of blood between the periosteum and which bone?", options: ["Skull bone", "Scalp skin", "Brain parenchyma", "Dura mater"], correctAnswer: "Skull bone", explanation: "A cephalohematoma is a hemorrhage of blood between the skull and the periosteum of a newborn baby's head." },
                { question: "Unlike caput succedaneum, a cephalohematoma:", options: ["Crosses suture lines", "Does not cross suture lines", "Is present at birth", "Is softer to palpation"], correctAnswer: "Does not cross suture lines", explanation: "A key distinguishing feature is that a cephalohematoma does not cross suture lines because the bleeding is contained by the periosteum attached to the bone." }
            ],
        },
    },
    // For "international-exam" type quizzes (can be a generic set or specific exams)
    "international-exam": [
        { question: "What is the primary source of energy for Earth's climate system?", options: ["The Sun", "Geothermal energy", "Nuclear energy", "Wind energy"], correctAnswer: "The Sun", explanation: "The Sun provides almost all the energy that drives Earth's climate and weather systems through solar radiation." },
        { question: "Which organ is responsible for insulin production?", options: ["Liver", "Pancreas", "Kidney", "Stomach"], correctAnswer: "Pancreas", explanation: "The pancreas produces insulin, a hormone that regulates blood sugar levels." },
        { question: "What is the chemical symbol for water?", options: ["H2O", "CO2", "O2", "H2SO4"], correctAnswer: "H2O", explanation: "H2O is the chemical formula for water, indicating two hydrogen atoms and one oxygen atom." },
        { question: "Which of the following is the largest artery in the human body?", options: ["Aorta", "Pulmonary Artery", "Carotid Artery", "Femoral Artery"], correctAnswer: "Aorta", explanation: "The aorta is the main artery that carries oxygenated blood from the heart to the rest of the body, making it the largest artery." },
        { question: "What is the normal body temperature in Celsius?", options: ["37°C", "35°C", "39°C", "40°C"], correctAnswer: "37°C", explanation: "The average normal human body temperature is generally accepted as 37°C (98.6°F)." },
        { question: "The process by which plants make their own food is called?", options: ["Photosynthesis", "Respiration", "Transpiration", "Fermentation"], correctAnswer: "Photosynthesis", explanation: "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water." },
        { question: "Which bone is commonly known as the 'kneecap'?", options: ["Patella", "Tibia", "Fibula", "Femur"], correctAnswer: "Patella", explanation: "The patella is a flat, movable bone situated at the front of the knee joint, commonly known as the kneecap." },
        { question: "What is the main function of red blood cells?", options: ["Carry oxygen", "Fight infection", "Clot blood", "Produce antibodies"], correctAnswer: "Carry oxygen", explanation: "Red blood cells (erythrocytes) primarily transport oxygen from the lungs to the body tissues and carry carbon dioxide as a waste product away from the tissues and back to the lungs." }
    ]
};

let currentQuestions = []; // This will hold the specific set of questions for the current quiz
let currentQuestionIndex = 0;
let userScore = 0;
let currentCoins = 0; // Tracks user's coins, updated from Firebase
let quizType = ''; // To store the quiz type for restart functionality

// Generates a 4-character alphanumeric App ID and its ASCII sum password.
function generateAppIdAndPassword() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let localAppId = '';
    for (let i = 0; i < 4; i++) {
        localAppId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const password = localAppId.split('').map(char => char.charCodeAt(0)).reduce((sum, val) => sum + val, 0).toString();
    return { appId: localAppId, password: password };
}

// Displays a temporary message box at the bottom right of the screen.
function showMessage(message, theme = 'info') {
    const box = document.getElementById('message-box');
    const text = document.getElementById('message-text');
    if (!box || !text) return;

    box.classList.remove('info', 'success', 'error'); // Clear previous themes
    box.classList.add('message-box', theme); // Add 'message-box' and current theme
    text.textContent = message;
    box.classList.add('show');

    setTimeout(() => box.classList.remove('show'), 3000);
}

// Updates the user's coin balance in Firestore and on the UI.
async function updateCoinBalance(newBalance) {
    if (!isFirebaseInitialized || !userIsAuthenticated || !profileDocRef) {
        showMessage("Cannot update coins in Demo Mode.", "info");
        return;
    }

    try {
        await updateDoc(profileDocRef, { coins: newBalance });
        document.getElementById('quiz-coin-balance').textContent = newBalance;
        showMessage(`Coin balance updated: ${newBalance} coins`, "success");
    } catch (e) {
        console.error("Error updating coins:", e);
        showMessage("Failed to update coins.", "error");
    }
}

// Fetches user data (specifically coin balance) from Firestore for the quiz page.
async function fetchQuizUserData() {
    if (!profileDocRef || !userIsAuthenticated) {
        // Fallback for demo mode or unauthenticated state
        document.getElementById('quiz-coin-balance').textContent = "Demo";
        return;
    }

    onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentCoins = data.coins || 1000;
            document.getElementById('quiz-coin-balance').textContent = currentCoins;
        } else {
            console.warn("User profile document not found. Using default coins (1000).");
            currentCoins = 1000;
            document.getElementById('quiz-coin-balance').textContent = currentCoins;
        }
    }, (error) => {
        console.error("Error listening to user profile:", error);
        showMessage("Failed to load user coin data.", "error");
        currentCoins = 1000; // Fallback
        document.getElementById('quiz-coin-balance').textContent = currentCoins;
    });
}

// Shows the quiz results modal
function showResultsModal() {
    document.getElementById('final-score').textContent = `${userScore}/${currentQuestions.length}`;
    document.getElementById('quiz-results-modal').classList.remove('hidden');
}

// Hides the quiz results modal
function hideResultsModal() {
    document.getElementById('quiz-results-modal').classList.add('hidden');
}

// Loads and displays the current question.
function loadQuestion() {
    // Hide explanation and "Next Question" button when loading a new question
    document.getElementById('explanation-container').classList.add('hidden');
    document.getElementById('explanation-text').textContent = ''; // Clear previous explanation
    document.getElementById('next-question-btn').classList.add('hidden');

    if (currentQuestionIndex >= currentQuestions.length) {
        showResultsModal(); // Show results modal instead of direct message and redirect
        return;
    }

    const question = currentQuestions[currentQuestionIndex];
    document.getElementById('question-number').textContent = `Question ${currentQuestionIndex + 1}/${currentQuestions.length}`;
    document.getElementById('quiz-question-text').textContent = question.question;

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = ''; // Clear previous options

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option py-3 px-4 bg-brown-accent text-yellow-text rounded-lg shadow-sm hover:bg-golden-yellow hover:text-brown-dark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-golden-yellow focus:ring-offset-2 focus:ring-offset-brown-dark';
        button.textContent = option;
        button.dataset.index = index; // Store index to identify option

        button.addEventListener('click', () => handleAnswer(button, option, question)); // Pass the whole question object
        optionsContainer.appendChild(button);
    });
}

// Handles user's answer selection.
function handleAnswer(selectedButton, selectedOption, question) { // Now accepts question object
    // Disable all options after one is selected to prevent multiple clicks
    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none'; // Further prevent clicks
    });

    if (selectedOption === question.correctAnswer) {
        userScore++;
        selectedButton.classList.remove('bg-brown-accent', 'hover:bg-golden-yellow', 'text-yellow-text');
        selectedButton.classList.add('correct'); // Highlight correct answer
        correctSound.play().catch(e => console.error("Sound play error:", e));
        showMessage("Correct!", "success");
    } else {
        selectedButton.classList.remove('bg-brown-accent', 'hover:bg-golden-yellow', 'text-yellow-text');
        selectedButton.classList.add('incorrect'); // Highlight incorrect answer
        incorrectSound.play().catch(e => console.error("Sound play error:", e));
        showMessage("Incorrect! -1 coin", "error");
        
        // Deduct coin and update Firebase
        if (currentCoins > 0) {
            currentCoins--;
            updateCoinBalance(currentCoins);
        } else {
            // Show contact modal if coins hit zero
            const { appId: contactAppId, password: contactPassword } = generateAppIdAndPassword();
            document.getElementById('app-id-display').textContent = contactAppId;
            document.getElementById('password-display').textContent = contactPassword;
            document.getElementById('whatsapp-link').href = `https://wa.me/+237652659429?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('telegram-link').href = `https://t.me/SchrDbb?text=App%20ID:%20${contactAppId}%0APassword:%20${contactPassword}`;
            document.getElementById('contact-modal').classList.remove('hidden');
        }

        // Highlight the correct answer even if the user chose incorrectly
        document.querySelectorAll('.quiz-option').forEach(btn => {
            if (btn.textContent === question.correctAnswer) {
                btn.classList.add('correct');
            }
        });
    }

    // Display explanation if available
    if (question.explanation) {
        document.getElementById('explanation-text').textContent = question.explanation;
        document.getElementById('explanation-container').classList.remove('hidden');
    }

    // Show "Next Question" button after an answer is selected
    document.getElementById('next-question-btn').classList.remove('hidden');
    // Ensure this listener only fires once per question to avoid multiple attaches
    const nextBtn = document.getElementById('next-question-btn');
    nextBtn.onclick = () => { // Clear previous handler and set new one
        currentQuestionIndex++;
        loadQuestion(); // Load the next question
        nextBtn.onclick = null; // Clear handler after click
    };
}


// Initializes the quiz page: authenticates, fetches user data, and starts the quiz.
async function initQuizPage() {
    // Determine which questions to load based on URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    quizType = urlParams.get('type');    // e.g., 'course', 'international-exam'
    const subject = urlParams.get('subject');  // e.g., 'biology', 'anatomy'
    const topic = urlParams.get('topic');      // e.g., 'taxonomy', 'cell-biology'

    console.log('[Quiz Init] URL Parameters:', { quizType, subject, topic });

    let quizTitle = "Loading Quiz...";

    if (quizType === 'course' && subject && topic) {
        // Attempt to load specific course questions by subject and topic
        console.log('[Quiz Init] Attempting to load course questions...');
        if (ALL_QUIZ_QUESTIONS.course[subject] && ALL_QUIZ_QUESTIONS.course[subject][topic]) {
            currentQuestions = ALL_QUIZ_QUESTIONS.course[subject][topic];
            // Format topic for display (e.g., 'cell-biology' -> 'Cell Biology')
            const formattedTopic = topic.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
            quizTitle = `${formattedSubject}: ${formattedTopic} Quiz`;
            console.log(`[Quiz Init] Successfully loaded questions for ${formattedSubject}: ${formattedTopic}`);
        } else {
            console.error(`[Quiz Init] No questions found for subject: ${subject}, topic: ${topic}. ALL_QUIZ_QUESTIONS.course[subject] is:`, ALL_QUIZ_QUESTIONS.course[subject]);
            showMessage("Quiz questions not found. Please select a valid topic.", "error");
            currentQuestions = []; // Ensure empty array if questions not found
            quizTitle = "Quiz Not Found";
            // Optionally redirect back or show an error state
            setTimeout(() => {
                window.location.href = 'course_test_selection.html';
            }, 3000);
        }
    } else if (quizType === 'international-exam') {
        console.log('[Quiz Init] Loading International Exam questions...');
        currentQuestions = ALL_QUIZ_QUESTIONS["international-exam"];
        quizTitle = "International Exam Practice";
    } else {
        console.warn("[Quiz Init] Invalid or missing quiz parameters. Loading default general questions if available.");
        // Fallback to a default set if parameters are missing or invalid
        currentQuestions = ALL_QUIZ_QUESTIONS["international-exam"] || [];
        quizTitle = "General Quiz";
    }

    document.getElementById('quiz-title').textContent = quizTitle;
    console.log('[Quiz Init] currentQuestions length:', currentQuestions.length);

    // Initialize Firebase (copied from your existing quiz.js)
    if (typeof __firebase_config !== 'undefined' && Object.keys(firebaseConfig).length > 0) {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            isFirebaseInitialized = true;
            console.log('[Firebase Init] Firebase app initialized.');


            // Authenticate using custom token if available, otherwise sign in anonymously
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log('[Firebase Auth] Signed in with custom token.');
            } else {
                await signInAnonymously(auth);
                console.log('[Firebase Auth] Signed in anonymously.');
            }

            onAuthStateChanged(auth, user => {
                if (user) {
                    userId = user.uid;
                    userIsAuthenticated = true;
                    profileDocRef = doc(db, 'artifacts', appId, 'users', userId, 'profile', 'data');
                    console.log('[Firebase Auth] User authenticated, User ID:', userId);
                    fetchQuizUserData(); // Fetch coin balance
                } else {
                    userIsAuthenticated = false;
                    userId = null;
                    profileDocRef = null;
                    showMessage("Authentication failed. Running in Demo Mode.", "error");
                    document.getElementById('quiz-coin-balance').textContent = "Demo";
                    console.warn('[Firebase Auth] Authentication failed. Running in Demo Mode.');
                }
            });

        } catch (e) {
            console.error("[Firebase Init] Firebase initialization or authentication error:", e);
            showMessage("Failed to connect to Firebase. Running in Demo Mode.", "error");
            isFirebaseInitialized = false;
            document.getElementById('quiz-coin-balance').textContent = "Demo";
        }
    } else {
        console.warn("[Firebase Init] Firebase config missing. Running quiz in Demo Mode (no coin persistence).");
        showMessage("Firebase config not found. Coins will not be saved.", "info");
        isFirebaseInitialized = false;
        document.getElementById('quiz-coin-balance').textContent = "Demo";
    }

    // Only load questions if there are any
    if (currentQuestions.length > 0) {
        loadQuestion(); // Start the first question for this specific quiz
    } else {
        document.getElementById('quiz-question-text').textContent = "No questions available for this topic.";
        document.getElementById('question-number').textContent = "Quiz Empty";
        document.getElementById('next-question-btn').classList.add('hidden');
        console.warn('[Quiz Init] No questions available to load. Displaying "Quiz Empty" message.');
    }
}

// Function to restart the quiz
function restartQuiz() {
    hideResultsModal();
    currentQuestionIndex = 0;
    userScore = 0;
    loadQuestion(); // Restart with the same set of questions
}


// Event Listeners for the results modal buttons
document.getElementById('restart-quiz-btn').addEventListener('click', restartQuiz);
document.getElementById('back-to-main-from-results').addEventListener('click', () => {
    window.location.href = 'main.html';
});
document.getElementById('close-contact-modal').addEventListener('click', () => {
    document.getElementById('contact-modal').classList.add('hidden');
});

// Run initialization when the DOM is fully loaded
window.addEventListener('DOMContentLoaded', initQuizPage);
