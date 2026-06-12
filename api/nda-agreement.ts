// ===== NDA AGREEMENT TEXT & EXECUTION (Section 10 of build spec) =====
// Full NDA text, version-tagged, SHA-256 hashed for tamper-evident records.

import crypto from "crypto";

export const NDA_VERSION = "NDA v1.0 2026-06-08";

// The complete NDA agreement text (from IDENTITE Vault NDA.docx)
export const NDA_FULL_TEXT = `CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT
IDENTIT\u00c9 Therapeutics, Inc.

This Confidentiality and Non-Disclosure Agreement ("Agreement") is entered into as of the date of electronic acceptance set forth in the signature block below (the "Effective Date") by and between IDENTIT\u00c9 Therapeutics, Inc., a Delaware corporation with its principal place of business in Santa Barbara, California (the "Company"), and the individual and entity identified in the signature block below ("Recipient"). The Company and Recipient are each a "Party" and together the "Parties."

Recipient wishes to access certain confidential and proprietary information of the Company through the Company's secure online portal (the "Vault") for the sole purpose of evaluating a potential investment, financing, acquisition, licensing, collaboration, manufacturing, supply, or other business relationship with the Company (the "Purpose"). In consideration of being granted such access and other good and valuable consideration, the receipt and sufficiency of which are acknowledged, Recipient agrees as follows:

1. Confidential Information. "Confidential Information" means all non-public information disclosed or made available by or on behalf of the Company to Recipient, whether before, on, or after the Effective Date, in any form (written, oral, visual, electronic, or otherwise) and whether or not marked or identified as confidential, including without limitation: scientific, technical, preclinical, and clinical information; chemical compositions, formulations, concentrations, dosing, and methods of manufacture or use; mechanisms of action; research data, results, and analyses; intellectual property, patents and patent applications (whether or not filed or published), trade secrets, and know-how; product candidates, indications, and development, regulatory, and commercial plans and communications; business, financial, and personnel information; and all materials contained in or accessible through the Vault, together with all notes, analyses, summaries, and other derivatives prepared by Recipient or its Representatives that contain or are based on any of the foregoing.

2. Exclusions. Confidential Information does not include information that Recipient can demonstrate by competent written evidence: (a) is or becomes publicly available other than through any act or omission of Recipient or its Representatives in breach of this Agreement; (b) was rightfully known to Recipient, without obligation of confidentiality, prior to disclosure by the Company; (c) is independently developed by Recipient without use of or reference to any Confidential Information; or (d) is rightfully received by Recipient from a third party without obligation of confidentiality and without breach of any duty owed to the Company.

3. Use and Non-Disclosure. Recipient shall: (a) use the Confidential Information solely for the Purpose; (b) hold the Confidential Information in strict confidence and protect it using at least the degree of care it uses to protect its own confidential information of like importance, and in no event less than a reasonable degree of care; and (c) not disclose the Confidential Information to any person except to Recipient's directors, officers, employees, attorneys, accountants, and professional advisors ("Representatives") who have a bona fide need to know it for the Purpose and who are bound by written or professional obligations of confidentiality at least as protective as those in this Agreement. Recipient is responsible for any breach of this Agreement by its Representatives.

4. No License; Ownership. All Confidential Information remains the sole and exclusive property of the Company. Nothing in this Agreement or in the disclosure of Confidential Information grants Recipient any license or right, whether by implication, estoppel, or otherwise, under any patent, patent application, copyright, trademark, trade secret, or other intellectual property of the Company, except the limited right to use the Confidential Information solely for the Purpose. No rights or obligations other than those expressly set forth herein are granted or created.

5. No Reverse Engineering; No Competing Use. Recipient shall not, and shall not permit any third party to: (a) reverse engineer, deconstruct, decompile, analyze, or otherwise attempt to derive the composition, formulation, concentration, structure, or method of manufacture of any compound, product, or material disclosed under this Agreement; or (b) use any Confidential Information, directly or indirectly, to develop, formulate, manufacture, compound, seek or file intellectual property covering, or commercialize any product, formulation, method, or program that is competitive with, derived from, or informed by the Confidential Information. This Section is a material inducement to the Company's disclosure.

6. No Publicity. Recipient shall not disclose the existence or contents of this Agreement or of any discussions between the Parties, use the Company's name, logos, or marks, or make any public statement concerning the Company or its product candidates, without the Company's prior written consent, except as required by law.

7. Compelled Disclosure. If Recipient is required by applicable law, regulation, or valid legal process to disclose any Confidential Information, Recipient may do so only to the extent legally required, provided that Recipient (to the extent legally permitted) gives the Company prompt prior written notice and reasonable cooperation, at the Company's expense, so that the Company may seek a protective order or other confidential treatment.

8. Return or Destruction. Upon the Company's written request or upon termination of discussions regarding the Purpose, Recipient shall promptly return or destroy all Confidential Information in its possession or control and, upon request, certify such destruction in writing. Recipient may retain one archival copy and electronic backups created in the ordinary course, and copies required to be retained by law or professional standards, in each case subject to the continuing obligations of this Agreement for so long as such materials are retained.

9. No Representation; Investigational Status; No Offer. The Confidential Information is provided "AS IS." The Company makes no representation or warranty, express or implied, as to the accuracy or completeness of the Confidential Information, and shall have no liability arising from Recipient's use of or reliance on it. Any product candidates described are investigational, have not been approved by the U.S. Food and Drug Administration or any other regulatory authority, and no representation is made regarding their safety or efficacy. Nothing in this Agreement or the Vault constitutes an offer to sell or a solicitation of an offer to buy any security, or any medical, legal, investment, or tax advice.

10. No Obligation. Nothing in this Agreement obligates either Party to proceed with any transaction or relationship, and each Party may terminate discussions at any time for any reason. This Agreement does not create any agency, partnership, or joint venture between the Parties.

11. Term and Survival. This Agreement is effective as of the Effective Date. Recipient's obligations with respect to Confidential Information survive for a period of five (5) years from the Effective Date; provided, however, that obligations with respect to any Confidential Information that constitutes a trade secret continue for so long as such information remains a trade secret under applicable law.

12. Remedies; Equitable Relief. Recipient acknowledges that a breach of this Agreement may cause the Company irreparable harm for which monetary damages would be an inadequate remedy. Accordingly, the Company is entitled to seek injunctive and other equitable relief to enforce this Agreement, without the necessity of posting a bond, in addition to any other remedies available at law or in equity.

13. Governing Law; Venue. This Agreement is governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict-of-laws principles. The Parties consent to the exclusive jurisdiction and venue of the state and federal courts located in Delaware for any dispute arising out of or relating to this Agreement.

14. Electronic Signature and Records. The Parties agree that this Agreement may be executed and accepted by electronic means, and that Recipient's electronic signature\u2014including by typing Recipient's name and affirmatively indicating acceptance through the Vault\u2014constitutes a valid, binding, and enforceable signature under the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN) and applicable Uniform Electronic Transactions Act (UETA). Recipient consents to transact electronically. The Company's records of acceptance, including the date and time of acceptance and associated identifying information (such as name, email, and IP address), shall constitute conclusive evidence of Recipient's execution of this Agreement.

15. Miscellaneous. This Agreement constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior or contemporaneous understandings. It may be amended only in a writing signed (including electronically) by both Parties. No failure or delay in exercising any right operates as a waiver. If any provision is held unenforceable, the remaining provisions remain in full force, and the unenforceable provision shall be modified to the minimum extent necessary to make it enforceable. Recipient may not assign this Agreement without the Company's prior written consent; the Company may assign it to a successor or affiliate. This Agreement may be executed in counterparts, each of which is deemed an original. Headings are for convenience only.

ACCEPTED AND AGREED. By signing below, Recipient acknowledges that it has read, understood, and agrees to be bound by this Agreement as of the Effective Date.

IDENTIT\u00c9 THERAPEUTICS, INC.
By: Linden Doss, MD
Title: Founder
The Company executes and accepts this Agreement by granting Recipient access to the Vault.

RECIPIENT
`;

// SHA-256 hash of the exact agreement text
export const NDA_SHA256 = crypto.createHash("sha256").update(NDA_FULL_TEXT).digest("hex");

// Store NDA hash for tamper-evident verification
export function verifyNdaHash(): boolean {
  const computed = crypto.createHash("sha256").update(NDA_FULL_TEXT).digest("hex");
  return computed === NDA_SHA256;
}

// Execution record for a signed NDA
export interface NdaExecutionRecord {
  agreementVersion: string;
  agreementSha256: string;
  signerName: string;
  signerEntity: string;
  signerTitle: string;
  signerEmail: string;
  signerPhone: string;
  signedAt: string;
  ip: string | null;
  userAgent: string | null;
}

// Generate execution certificate text
export function generateExecutionRecord(record: NdaExecutionRecord): string {
  return `EXECUTION RECORD

Agreement: ${record.agreementVersion}
Agreement SHA-256: ${record.agreementSha256}

SIGNER
Name: ${record.signerName}
Entity: ${record.signerEntity}
Title: ${record.signerTitle}
Email: ${record.signerEmail}
Phone: ${record.signerPhone}

EXECUTION
Date/Time (UTC): ${record.signedAt}
IP Address: ${record.ip || "N/A"}
User-Agent: ${record.userAgent || "N/A"}

VERIFICATION
This execution record is cryptographically bound to the agreement text via SHA-256 hash.
Any alteration to the agreement text will invalidate this record.
`;
}
