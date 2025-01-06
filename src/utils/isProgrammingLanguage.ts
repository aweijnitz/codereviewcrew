

/** Predicate that returns true if the given string is a programming language
 *
 * @param lang
 */
 export default function isProgrammingLanguage(lang: string): boolean {
     lang += ''; // Ensure lang is a string
    const programmingLanguages = ['javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'ruby', 'go', 'swift', 'kotlin'];
    return programmingLanguages.includes(lang.toLowerCase());
}
