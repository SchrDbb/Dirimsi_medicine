// js/biology_mcq.js

// This file contains all biology quiz questions, categorized by subtopic.
// This modular approach allows quiz.js to import only the necessary questions.

export const biologyQuestions = {
    "taxonomy": [
        {
            question: "Which of the following is the broadest classification rank in taxonomy?",
            options: ["Family", "Genus", "Kingdom", "Species"],
            correctAnswer: "Kingdom",
            explanation: "In the hierarchical classification system, Kingdom is the highest and broadest rank, encompassing a large variety of organisms with shared fundamental characteristics."
        },
        {
            question: "Who is known as the 'Father of Taxonomy'?",
            options: ["Charles Darwin", "Gregor Mendel", "Carolus Linnaeus", "Louis Pasteur"],
            correctAnswer: "Carolus Linnaeus",
            explanation: "Carolus Linnaeus developed the system of binomial nomenclature and hierarchical classification, which is still largely used today."
        },
        {
            question: "In the binomial nomenclature system, the first part of the name represents the:",
            options: ["Species", "Family", "Genus", "Order"],
            correctAnswer: "Genus",
            explanation: "Binomial nomenclature assigns each species a two-part name. The first part is the genus, and the second is the species epithet."
        },
        {
            question: "Which taxonomic rank is immediately below 'Order'?",
            options: ["Class", "Family", "Phylum", "Genus"],
            correctAnswer: "Family",
            explanation: "The hierarchy of taxonomic ranks is: Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species."
        },
        {
            question: "Organisms that can interbreed and produce fertile offspring belong to the same:",
            options: ["Genus", "Family", "Species", "Class"],
            correctAnswer: "Species",
            explanation: "A species is defined as a group of organisms that are able to interbreed and produce fertile offspring."
        }
    ],
    "digestive-system": [
        {
            question: "Which organ produces bile?",
            options: ["Stomach", "Pancreas", "Gallbladder", "Liver"],
            correctAnswer: "Liver",
            explanation: "Bile is produced by the liver and stored in the gallbladder. It helps in the digestion and absorption of fats."
        },
        {
            question: "Where does most nutrient absorption occur in the digestive system?",
            options: ["Stomach", "Large Intestine", "Small Intestine", "Esophagus"],
            correctAnswer: "Small Intestine",
            explanation: "The small intestine, particularly the jejunum and ileum, is adapted with villi and microvilli to maximize the surface area for nutrient absorption."
        },
        {
            question: "What is the primary function of the large intestine?",
            options: ["Digestion of fats", "Absorption of water", "Protein synthesis", "Carbohydrate breakdown"],
            correctAnswer: "Absorption of water",
            explanation: "The large intestine's main role is to absorb water and electrolytes from indigestible food matter, forming feces for elimination."
        },
        {
            question: "The muscular contractions that move food through the digestive tract are called:",
            options: ["Osmosis", "Diffusion", "Peristalsis", "Segmentation"],
            correctAnswer: "Peristalsis",
            explanation: "Peristalsis is the wave-like muscular contractions that propel food through the esophagus, stomach, and intestines."
        },
        {
            question: "Which enzyme is primarily responsible for breaking down proteins in the stomach?",
            options: ["Amylase", "Lipase", "Pepsin", "Trypsin"],
            correctAnswer: "Pepsin",
            explanation: "Pepsin is a protease enzyme secreted in the stomach that initiates the breakdown of proteins into smaller polypeptides."
        }
    ],
    "cell-biology": [
        {
            question: "What is the powerhouse of the cell?",
            options: ["Nucleus", "Mitochondria", "Ribosome", "Endoplasmic Reticulum"],
            correctAnswer: "Mitochondria",
            explanation: "Mitochondria are often called the 'powerhouses' of the cell because they generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy."
        },
        {
            question: "Which of the following is a prokaryotic cell?",
            options: ["Animal cell", "Plant cell", "Fungus cell", "Bacteria cell"],
            correctAnswer: "Bacteria cell",
            explanation: "Prokaryotic cells, like bacteria, lack a membrane-bound nucleus and other membrane-bound organelles, unlike eukaryotic cells (animal, plant, fungus cells)."
        },
        {
            question: "Which organelle is responsible for packaging and modifying proteins?",
            options: ["Mitochondria", "Lysosome", "Golgi Apparatus", "Vacuole"],
            correctAnswer: "Golgi Apparatus",
            explanation: "The Golgi apparatus (or Golgi complex) is involved in modifying, sorting, and packaging proteins and lipids for secretion or delivery to other organelles."
        },
        {
            question: "What is the primary function of the cell membrane?",
            options: ["Protein synthesis", "Energy production", "Controlling passage of substances", "Storing genetic material"],
            correctAnswer: "Controlling passage of substances",
            explanation: "The cell membrane, being selectively permeable, regulates the movement of substances into and out of the cell, maintaining cellular homeostasis."
        },
        {
            question: "The jelly-like substance that fills the cell and surrounds the organelles is called:",
            options: ["Nucleoplasm", "Cytoplasm", "Mitochondrial matrix", "Endoplasmic reticulum"],
            correctAnswer: "Cytoplasm",
            explanation: "Cytoplasm refers to all the material within a eukaryotic cell, enclosed by the cell membrane, except for the cell nucleus. It consists of cytosol and organelles."
        }
    ],
    "genetics": [
        {
            question: "Which molecule carries genetic information from DNA to the ribosomes?",
            options: ["tRNA", "mRNA", "rRNA", "DNA Polymerase"],
            correctAnswer: "mRNA",
            explanation: "Messenger RNA (mRNA) carries the genetic code from DNA in the nucleus to ribosomes in the cytoplasm, where protein synthesis occurs."
        },
        {
            question: "What is the genetic material found in all living organisms?",
            options: ["RNA", "Protein", "DNA", "Lipid"],
            correctAnswer: "DNA",
            explanation: "Deoxyribonucleic acid (DNA) is the hereditary material in humans and almost all other organisms, containing the instructions for making proteins."
        },
        {
            question: "The process of cell division in which a cell divides into two identical daughter cells?",
            options: ["Meiosis", "Mitosis", "Fertilization", "Photosynthesis"],
            correctAnswer: "Mitosis",
            explanation: "Mitosis is a type of cell division that results in two daughter cells each having the same number and kind of chromosomes as the parent nucleus."
        },
        {
            question: "A segment of DNA that codes for a specific protein is called a:",
            options: ["Chromosome", "Allele", "Gene", "Nucleotide"],
            correctAnswer: "Gene",
            explanation: "A gene is a basic unit of heredity, consisting of a segment of DNA or RNA that codes for a molecule (like a protein or RNA) that has a function."
        },
        {
            question: "If an organism has two identical alleles for a particular trait, it is said to be:",
            options: ["Heterozygous", "Homozygous", "Dominant", "Recessive"],
            correctAnswer: "Homozygous",
            explanation: "Homozygous refers to having identical alleles (e.g., AA or aa) for a single trait, in contrast to heterozygous (e.g., Aa)."
        }
    ]
};
