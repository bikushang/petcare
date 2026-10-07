import type {
  Pet, Owner, Appointment, MedRecord, Prescription, LabTest,
  Surgery, Vaccination, Invoice, Staff,
} from './api';

export type AISuggestionType =
  | 'symptom-analysis'
  | 'prescription-suggestion'
  | 'soap-note'
  | 'medical-report'
  | 'vaccination-recommendation'
  | 'follow-up-recommendation'
  | 'appointment-summary'
  | 'surgery-summary'
  | 'lab-explanation'
  | 'whatsapp-draft'
  | 'email-draft'
  | 'business-insight'
  | 'revenue-forecast'
  | 'inventory-forecast'
  | 'demand-prediction'
  | 'smart-search'
  | 'knowledge-base'
  | 'client-communication';

export type AISuggestion = {
  id: string;
  type: AISuggestionType;
  title: string;
  content: string;
  confidence: number;
  requiresReview: boolean;
  createdAt: string;
  context?: string;
};

const now = () => new Date().toISOString();
const id = () => `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ageYears = (birthDate: string) => {
  if (!birthDate) return 0;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
};

/* ── Symptom Analysis ── */
export function generateSymptomAnalysis(pet: Pet, symptoms: string): AISuggestion {
  const species = pet.species;
  const age = ageYears(pet.birthDate);
  const symptomLower = symptoms.toLowerCase();

  let possibleConditions: string[] = [];
  let severity = 'Mild';
  let recommendation = '';

  if (symptomLower.includes('vomit') || symptomLower.includes('throw up') || symptomLower.includes('nausea')) {
    possibleConditions = ['Gastritis', 'Dietary indiscretion', 'Foreign body ingestion', 'Pancreatitis'];
    severity = 'Moderate';
    recommendation = 'Recommend fasting for 12-24 hours, then bland diet. If vomiting persists beyond 24 hours or is accompanied by lethargy, perform abdominal radiographs and blood work including CBC and biochemistry panel.';
  } else if (symptomLower.includes('itch') || symptomLower.includes('scratch') || symptomLower.includes('skin')) {
    possibleConditions = ['Atopic dermatitis', 'Flea allergy dermatitis', 'Food allergy', 'Contact dermatitis'];
    severity = 'Mild';
    recommendation = 'Perform skin scraping to rule out mites. Consider trial with antihistamines and omega-3 supplementation. Recommend flea prevention review and possible elimination diet trial for 8 weeks.';
  } else if (symptomLower.includes('limp') || symptomLower.includes('lame') || symptomLower.includes('leg')) {
    possibleConditions = ['Soft tissue injury', 'Sprain/strain', 'Osteoarthritis flare', 'Patellar luxation'];
    severity = age > 7 ? 'Moderate' : 'Mild';
    recommendation = 'Recommend strict rest for 7-10 days, leash walks only. Perform orthopedic exam and radiographs if no improvement. Consider NSAIDs (carprofen 2.2 mg/kg BID) if pain is significant and renal values are normal.';
  } else if (symptomLower.includes('cough') || symptomLower.includes('sneeze') || symptomLower.includes('respiratory')) {
    possibleConditions = ['Upper respiratory infection', 'Kennel cough', 'Allergic rhinitis', 'Heart disease (if senior)'];
    severity = age > 8 ? 'Moderate' : 'Mild';
    recommendation = 'Auscultate heart and lungs. If cough is productive or persistent, consider thoracic radiographs. For suspected URI, supportive care and isolation from other pets for 2 weeks.';
  } else if (symptomLower.includes('diarrhea') || symptomLower.includes('loose stool') || symptomLower.includes('bowel')) {
    possibleConditions = ['Dietary indiscretion', 'Parasitic infection', 'Stress colitis', 'IBD'];
    severity = 'Mild';
    recommendation = 'Perform fecal flotation and parvo test if unvaccinated. Recommend bland diet (boiled chicken and rice) for 3-5 days. Probiotics and metronidazole if bacterial component suspected.';
  } else if (symptomLower.includes('letharg') || symptomLower.includes('tired') || symptomLower.includes('weak')) {
    possibleConditions = ['Anemia', 'Infection', 'Pain', 'Endocrine disorder', 'Dehydration'];
    severity = 'Moderate';
    recommendation = 'Perform CBC, biochemistry, and urinalysis. Check hydration status and mucous membrane color. Consider T4 if geriatric patient. Monitor appetite and water intake closely.';
  } else if (symptomLower.includes('not eating') || symptomLower.includes('anorexia') || symptomLower.includes('appetite')) {
    possibleConditions = ['Dental disease', 'Nausea', 'Pain', 'Systemic illness', 'Stress'];
    severity = 'Moderate';
    recommendation = 'Oral exam to rule out dental disease. If anorexia persists >48 hours, blood work and imaging recommended. Consider appetite stimulant (mirtazapine 1.88 mg PO) as interim measure.';
  } else {
    possibleConditions = ['Requires further evaluation', 'Possible underlying condition'];
    severity = 'Mild';
    recommendation = 'Based on the reported symptoms, a thorough physical examination is recommended. Consider baseline blood work (CBC, biochemistry) and document all findings. Monitor for progression or additional symptoms.';
  }

  const content = `PRESENTING COMPLAINT
${symptoms}

PATIENT PROFILE
${pet.name}, ${age} year old ${species === 'Other' ? pet.breed || 'animal' : species}, ${pet.breed || 'mixed breed'}, ${pet.weightKg}kg, ${pet.gender}

DIFFERENTIAL DIAGNOSES (ranked by likelihood)
${possibleConditions.map((c, i) => `${i + 1}. ${c}`).join('\n')}

ASSESSMENT
Severity: ${severity}
Based on the reported symptoms and patient profile, the most likely differentials have been identified. Clinical examination and diagnostic testing are needed to confirm.

RECOMMENDED NEXT STEPS
${recommendation}

IMPORTANT: This AI-generated analysis is a preliminary assessment based on reported symptoms only. A licensed veterinarian must perform a physical examination and confirm the diagnosis before initiating treatment.`;

  return {
    id: id(),
    type: 'symptom-analysis',
    title: `Symptom Analysis — ${pet.name}`,
    content,
    confidence: 0.72,
    requiresReview: true,
    createdAt: now(),
    context: `Patient: ${pet.name} (${pet.species}, ${pet.breed})`,
  };
}

/* ── Prescription Suggestion ── */
export function generatePrescriptionSuggestion(pet: Pet, medRecord?: MedRecord): AISuggestion {
  const weight = pet.weightKg;
  const conditions = medRecord?.diagnosis || medRecord?.chiefComplaint || 'General consultation';

  let meds: { name: string; dose: string; route: string; frequency: string; duration: string }[] = [];

  const condLower = conditions.toLowerCase();
  if (condLower.includes('infection') || condLower.includes('wound') || condLower.includes('abscess')) {
    meds.push({ name: 'Amoxicillin/Clavulanate', dose: `${(weight * 12.5).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '7-10 days' });
    meds.push({ name: 'Carprofen', dose: `${(weight * 2.2).toFixed(0)}mg`, route: 'PO', frequency: 'SID', duration: '5 days' });
  } else if (condLower.includes('pain') || condLower.includes('surgery') || condLower.includes('injury')) {
    meds.push({ name: 'Tramadol', dose: `${(weight * 2).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '5-7 days' });
    meds.push({ name: 'Gabapentin', dose: `${(weight * 5).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '7 days' });
  } else if (condLower.includes('allergy') || condLower.includes('dermatitis') || condLower.includes('itch')) {
    meds.push({ name: 'Apoquel', dose: `${(weight * 0.6).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '14 days' });
    meds.push({ name: 'Cephalexin', dose: `${(weight * 15).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '10 days' });
  } else if (condLower.includes('vomit') || condLower.includes('gastritis') || condLower.includes('nausea')) {
    meds.push({ name: 'Maropitant', dose: `${(weight * 1).toFixed(0)}mg`, route: 'PO', frequency: 'SID', duration: '5 days' });
    meds.push({ name: 'Metronidazole', dose: `${(weight * 7.5).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '7 days' });
  } else {
    meds.push({ name: 'Amoxicillin/Clavulanate', dose: `${(weight * 12.5).toFixed(0)}mg`, route: 'PO', frequency: 'BID', duration: '7 days' });
    meds.push({ name: 'Carprofen', dose: `${(weight * 2.2).toFixed(0)}mg`, route: 'PO', frequency: 'SID', duration: '5 days' });
  }

  const content = `PRESCRIPTION SUGGESTION
Patient: ${pet.name} (${pet.species}, ${weight}kg)
Condition: ${conditions}

${meds.map((m) => `• ${m.name} ${m.dose} ${m.route} ${m.frequency} × ${m.duration}`).join('\n')}

NOTES
- Verify no known drug allergies before prescribing
- Adjust dose for renal/hepatic impairment if indicated
- Monitor for adverse reactions, especially GI upset
- Complete full course of antibiotics even if symptoms improve

IMPORTANT: This AI-generated prescription suggestion is based on the diagnosed condition and patient weight. A licensed veterinarian must review and approve before dispensing. Verify drug interactions and contraindications.`;

  return {
    id: id(),
    type: 'prescription-suggestion',
    title: `Prescription Suggestion — ${pet.name}`,
    content,
    confidence: 0.78,
    requiresReview: true,
    createdAt: now(),
    context: `Patient: ${pet.name} (${pet.weightKg}kg)`,
  };
}

/* ── SOAP Note Generation ── */
export function generateSOAPNote(pet: Pet, appointment?: Appointment, medRecord?: MedRecord): AISuggestion {
  const content = `SOAP NOTE — ${pet.name}
Date: ${appointment?.date || new Date().toISOString().split('T')[0]}
Veterinarian: ${appointment?.vet || '—'}
Reason for visit: ${appointment?.service || medRecord?.type || 'Consultation'}

S (Subjective)
Owner reports that ${pet.name}, a ${ageYears(pet.birthDate)} year old ${pet.gender} ${pet.breed || pet.species}, presented with ${medRecord?.chiefComplaint || appointment?.service || 'concerns requiring evaluation'}. The owner describes symptoms that prompted the visit. Duration and progression of signs as reported by the owner.

O (Objective)
Temperature: __ °C
Heart rate: __ bpm
Respiratory rate: __ rpm
Weight: ${pet.weightKg} kg
Body condition score: __/9
Mucous membranes: __
Capillary refill time: __ sec
Hydration status: __
Physical exam findings: [To be completed by examining veterinarian]

A (Assessment)
1. ${medRecord?.diagnosis || 'Pending examination findings'}
2. Differential diagnoses to consider based on history and presenting signs
2. Differential diagnoses to consider based on history and presenting signs
3. Overall stability: Stable / Guarded / Critical

P (Plan)
1. Diagnostics: ${medRecord?.treatmentPlan || 'As indicated by exam findings'}
2. Treatments: As prescribed based on assessment
3. Home care: Owner instructions and monitoring parameters
4. Follow-up: Recheck in __ days or sooner if symptoms worsen
5. Client communication: Owner briefed on findings, plan, and prognosis

IMPORTANT: This AI-generated SOAP note template must be completed and verified by the attending veterinarian before being saved to the patient record.`;

  return {
    id: id(),
    type: 'soap-note',
    title: `SOAP Note — ${pet.name}`,
    content,
    confidence: 0.85,
    requiresReview: true,
    createdAt: now(),
    context: `Patient: ${pet.name}`,
  };
}

/* ── Medical Report Writing ── */
export function generateMedicalReport(pet: Pet, medRecord: MedRecord): AISuggestion {
  const content = `MEDICAL REPORT
Patient: ${pet.name}
Species: ${pet.species}
Breed: ${pet.breed || '—'}
Age: ${ageYears(pet.birthDate)} years
Gender: ${pet.gender}
Weight: ${pet.weightKg} kg

Date of Visit: ${medRecord.date}
Attending Veterinarian: ${medRecord.vet}
Record Type: ${medRecord.type}

CHIEF COMPLAINT
${medRecord.chiefComplaint || 'Not specified'}

CLINICAL FINDINGS
${medRecord.diagnosis || 'Pending assessment'}

TREATMENT PROVIDED
${medRecord.treatment || 'No treatment recorded'}

MEDICATIONS PRESCRIBED
${medRecord.treatmentPlan || 'None recorded'}

FOLLOW-UP INSTRUCTIONS
${medRecord.treatmentPlan || 'No specific follow-up instructions'}

PROGNOSIS
[To be assessed by attending veterinarian]

IMPORTANT: This AI-generated medical report is a draft based on existing record data. A veterinarian must review, complete, and approve before filing or sharing with the client.`;

  return {
    id: id(),
    type: 'medical-report',
    title: `Medical Report — ${pet.name}`,
    content,
    confidence: 0.82,
    requiresReview: true,
    createdAt: now(),
    context: `Record: ${medRecord.id}`,
  };
}

/* ── Vaccination Recommendation ── */
export function generateVaccinationRecommendation(pet: Pet, vaccinations: Vaccination[]): AISuggestion {
  const completed = vaccinations.filter((v) => v.status === 'Completed');
  const completedNames = completed.map((v) => v.vaccineName);
  const pending = vaccinations.filter((v) => v.status === 'Scheduled' || v.status === 'Pending');

  const coreVaccines = pet.species === 'Dog'
    ? ['Rabies', 'DHPP (Distemper, Hepatitis, Parainfluenza, Parvovirus)', 'Bordetella']
    : pet.species === 'Cat'
    ? ['Rabies', 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)', 'FeLV (Feline Leukemia)']
    : ['Species-specific core vaccine — consult veterinary guidelines'];

  const missing = coreVaccines.filter((v) => !completedNames.some((c) => c.includes(v.split(' ')[0])));
  const overdue = vaccinations.filter((v) => v.status === 'Overdue');

  const content = `VACCINATION RECOMMENDATION
Patient: ${pet.name} (${pet.species}, ${ageYears(pet.birthDate)} years)

CURRENT VACCINATION STATUS
Completed: ${completed.length > 0 ? completedNames.join(', ') : 'None on record'}
Scheduled/Pending: ${pending.length > 0 ? pending.map((p) => `${p.vaccineName} (${p.dateGiven})`).join(', ') : 'None'}
Overdue: ${overdue.length > 0 ? overdue.map((o) => o.vaccineName).join(', ') : 'None'}

CORE VACCINES ${pet.species === 'Dog' ? '(Canine)' : pet.species === 'Cat' ? '(Feline)' : ''}
${coreVaccines.map((v) => `• ${v}${missing.includes(v) ? ' — RECOMMENDED' : ' ✓ Up to date'}`).join('\n')}

RECOMMENDATIONS
${missing.length > 0 ? `The following core vaccines are recommended:\n${missing.map((m) => `• Schedule ${m} at earliest convenience`).join('\n')}` : 'All core vaccines appear current. Continue with annual boosters as scheduled.'}
${overdue.length > 0 ? `\nOVERDUE VACCINES — Priority action required:\n${overdue.map((o) => `• ${o.vaccineName} was due ${o.nextDueDate}`).join('\n')}` : ''}

LIFESTAGE CONSIDERATIONS
${ageYears(pet.birthDate) < 1 ? 'Puppy/Kitten series should be completed with boosters at 12 and 16 weeks.' : ageYears(pet.birthDate) > 7 ? 'Senior patient — consider titers instead of automatic boosters if previously vaccinated.' : 'Adult patient — maintain annual or triennial schedule as appropriate.'}

IMPORTANT: This AI-generated vaccination recommendation is based on the patient record. A veterinarian must review the vaccination history and confirm recommendations before administration.`;

  return {
    id: id(),
    type: 'vaccination-recommendation',
    title: `Vaccination Plan — ${pet.name}`,
    content,
    confidence: 0.88,
    requiresReview: true,
    createdAt: now(),
    context: `Patient: ${pet.name}`,
  };
}

/* ── Follow-up Recommendation ── */
export function generateFollowUpRecommendation(pet: Pet, medRecord?: MedRecord, surgery?: Surgery): AISuggestion {
  const condition = medRecord?.diagnosis || surgery?.procedureName || 'recent visit';
  const date = medRecord?.date || surgery?.date || new Date().toISOString().split('T')[0];

  const content = `FOLLOW-UP RECOMMENDATION
Patient: ${pet.name} (${pet.species}, ${ageYears(pet.birthDate)} years)
Condition: ${condition}
Visit date: ${date}

RECOMMENDED FOLLOW-UP SCHEDULE
• First recheck: 7-10 days post-treatment/procedure
• Second recheck: 30 days post-treatment (if applicable)
• Long-term monitoring: 3-6 months depending on condition

MONITORING PARAMETERS
• Appetite and water intake — daily for first week
• Activity level — gradual return to normal expected within 7 days
• Incision site (if surgery) — monitor for redness, swelling, discharge daily
• Medication compliance — ensure full course completed
• Weight — recheck at each visit

OWNER INSTRUCTIONS
• Monitor ${pet.name} closely for the next 7 days
• Report any of the following immediately: lethargy, anorexia >24h, vomiting, diarrhea, fever, or incision site concerns
• Administer all prescribed medications as directed
• Restrict activity as recommended for the healing period
• Keep incision clean and dry (if applicable)

ALERT CRITERIA — Contact clinic immediately if:
• Body temperature above 39.5°C (103°F)
• Refusal to eat for more than 24 hours
• Persistent vomiting or diarrhea
• Signs of pain not controlled by medication
• Incision site: excessive swelling, heat, discharge, or dehiscence

IMPORTANT: This AI-generated follow-up plan should be reviewed and customized by the attending veterinarian based on the specific procedure and patient response.`;

  return {
    id: id(),
    type: 'follow-up-recommendation',
    title: `Follow-up Plan — ${pet.name}`,
    content,
    confidence: 0.83,
    requiresReview: true,
    createdAt: now(),
    context: `Patient: ${pet.name}`,
  };
}

/* ── Appointment Summary ── */
export function generateAppointmentSummary(appointment: Appointment, pet: Pet, owner: Owner): AISuggestion {
  const content = `APPOINTMENT SUMMARY
Date: ${appointment.date}
Time: ${appointment.time}
Patient: ${pet.name} (${pet.species}, ${pet.breed || '—'})
Owner: ${owner.name}
Veterinarian: ${appointment.vet}
Service: ${appointment.service}
Status: ${appointment.status}

REASON FOR VISIT
${appointment.reason || appointment.service}

KEY DISCUSSION POINTS
• Presenting complaint and history reviewed with owner
• Physical examination performed
• Diagnostic plan discussed
• Treatment options reviewed
• Owner questions and concerns addressed

OUTCOMES
• Assessment: [To be completed by veterinarian]
• Plan: [To be completed by veterinarian]
• Prescriptions: [If applicable]
• Follow-up: [If applicable]

CLIENT SATISFACTION
• Owner appeared satisfied with the consultation
• No concerns raised about the service provided
• Owner instructed to call with any questions

IMPORTANT: This AI-generated appointment summary is a draft. The attending veterinarian should review and finalize before saving to the patient record.`;

  return {
    id: id(),
    type: 'appointment-summary',
    title: `Appointment Summary — ${pet.name} (${appointment.date})`,
    content,
    confidence: 0.80,
    requiresReview: true,
    createdAt: now(),
    context: `Appointment: ${appointment.id}`,
  };
}

/* ── Surgery Summary ── */
export function generateSurgerySummary(surgery: Surgery, pet: Pet, owner: Owner): AISuggestion {
  const content = `SURGICAL SUMMARY REPORT
Date: ${surgery.date}
Patient: ${pet.name} (${pet.species}, ${pet.breed || '—'}, ${pet.weightKg}kg)
Owner: ${owner.name}
Surgeon: ${surgery.staff.find((s) => s.role === 'Surgeon')?.staffName || surgery.staff[0]?.staffName || '—'}
Procedure: ${surgery.procedureName}
Theater: ${surgery.theater}
Status: ${surgery.status}

PRE-OPERATIVE ASSESSMENT
• Pre-anesthetic blood work: [Results]
• Anesthetic risk: Standard
• Pre-medication: [Details]

ANESTHESIA RECORD
• Induction agent: [To be completed]
• Maintenance: [To be completed]
• Monitoring: [Continuous ECG, SpO2, EtCO2, BP]
• Total anesthetic time: [Duration]

SURGICAL FINDINGS
${surgery.surgeryNotes || 'To be documented by surgeon'}

PROCEDURE DETAILS
• Surgical approach: [Standard approach for procedure]
• Intraoperative findings: [To be documented]
• Complications: ${surgery.complications || 'None reported'}
• Estimated blood loss: [Volume or minimal]

POST-OPERATIVE STATUS
• Recovery: [Smooth / Delayed / Complicated]
• Pain management: [Protocol]
• Post-op medications: [Details]

SURGICAL TEAM
${surgery.staff.map((s) => `• ${s.staffName} — ${s.role}`).join('\n')}

DISCHARGE INSTRUCTIONS
• Activity restriction: 10-14 days
• Elizabethan collar: Required until incision healed
• Incision care: Monitor daily, keep clean and dry
• Medications: As prescribed
• Suture removal: 10-14 days post-op

IMPORTANT: This AI-generated surgical summary must be reviewed and completed by the attending surgeon before being filed in the patient record or shared with the owner.`;

  return {
    id: id(),
    type: 'surgery-summary',
    title: `Surgery Summary — ${pet.name} (${surgery.procedureName})`,
    content,
    confidence: 0.81,
    requiresReview: true,
    createdAt: now(),
    context: `Surgery: ${surgery.id}`,
  };
}

/* ── Lab Report Explanation ── */
export function generateLabExplanation(labTest: LabTest, pet: Pet): AISuggestion {
  const content = `LABORATORY REPORT EXPLANATION
Test: ${labTest.testName}
Type: ${labTest.testType}
Category: ${labTest.testCategory}
Patient: ${pet.name} (${pet.species}, ${ageYears(pet.birthDate)} years)
Date ordered: ${labTest.dateOrdered}
Status: ${labTest.status}
Priority: ${labTest.priority}

SAMPLE DETAILS
Type: ${labTest.sampleType}
Volume: ${labTest.sampleVolume}
Collection method: ${labTest.collectionMethod}
Barcode: ${labTest.barcode}

RESULTS SUMMARY
${labTest.status === 'Completed' ? 'Results are available. See full report for values.' : 'Results pending — test is currently in progress.'}

PLAIN-LANGUAGE EXPLANATION
This test was ordered to ${labTest.testType === 'Blood test' ? 'evaluate blood parameters including red and white blood cells, organ function, and electrolyte levels' : labTest.testType === 'Imaging' ? 'visualize internal structures and identify any abnormalities' : 'analyze a biological sample for diagnostic markers'}.

The ${labTest.testCategory} category specifically looks for ${labTest.testCategory === 'CBC' ? 'red blood cell count, white blood cell differentials, hemoglobin, and platelets to assess for anemia, infection, or clotting disorders' : labTest.testCategory === 'Biochemistry' ? 'liver enzymes, kidney values, glucose, and proteins to evaluate organ function' : labTest.testCategory === 'Urinalysis' ? 'urine concentration, pH, protein, blood, and microscopic elements' : labTest.testCategory === 'X-ray' ? 'bone integrity, organ size and position, and potential foreign bodies or masses' : 'specific diagnostic markers relevant to the suspected condition'}.

CLINICAL SIGNIFICANCE
Results should be interpreted in conjunction with:
• Physical examination findings
• Patient history and presenting signs
• Previous test results for comparison
• Current medications and treatments

WHAT THE RESULTS MAY INDICATE
• Normal results: Support ruling out certain conditions
• Abnormal results: Help narrow differential diagnoses and guide treatment
• Borderline results: May require repeat testing or additional diagnostics

IMPORTANT: This AI-generated explanation is for educational purposes and does not constitute a diagnosis. A licensed veterinarian must interpret the actual results in clinical context before making treatment decisions.`;

  return {
    id: id(),
    type: 'lab-explanation',
    title: `Lab Report Explanation — ${labTest.testName}`,
    content,
    confidence: 0.86,
    requiresReview: true,
    createdAt: now(),
    context: `Lab test: ${labTest.id}`,
  };
}

/* ── WhatsApp Reply Draft ── */
export function generateWhatsAppDraft(owner: Owner, pet: Pet, context: string): AISuggestion {
  const content = `Hi ${owner.name.split(' ')[0]}! 👋

This is ${pet.name}'s veterinary clinic following up on your recent visit.

${context}

If you have any questions or concerns about ${pet.name}, please don't hesitate to reach out. We're here to help!

Best regards,
The team at your veterinary clinic 🐾`;

  return {
    id: id(),
    type: 'whatsapp-draft',
    title: `WhatsApp Reply — ${owner.name}`,
    content,
    confidence: 0.90,
    requiresReview: true,
    createdAt: now(),
    context: `Owner: ${owner.name}`,
  };
}

/* ── Email Draft ── */
export function generateEmailDraft(owner: Owner, pet: Pet, subject: string, context: string): AISuggestion {
  const content = `Subject: ${subject}

Dear ${owner.name},

Thank you for visiting us with ${pet.name}. We hope everything is going well at home.

${context}

As always, if you notice any changes in ${pet.name}'s condition or have any questions about the care plan, please contact us at your earliest convenience. Our team is happy to help.

Warm regards,
The Veterinary Team
${pet.name}'s Care Team

---
This email was prepared as a draft. Please review and personalize before sending.`;

  return {
    id: id(),
    type: 'email-draft',
    title: `Email Draft — ${owner.name}`,
    content,
    confidence: 0.91,
    requiresReview: true,
    createdAt: now(),
    context: `Owner: ${owner.name}`,
  };
}

/* ── Client Communication Draft ── */
export function generateClientCommunication(owner: Owner, pet: Pet, type: 'reminder' | 'results' | 'follow-up' | 'overdue'): AISuggestion {
  let subject = '';
  let body = '';

  switch (type) {
    case 'reminder':
      subject = `Appointment Reminder for ${pet.name}`;
      body = `This is a friendly reminder that ${pet.name} has an upcoming appointment. Please let us know if you need to reschedule.`;
      break;
    case 'results':
      subject = `Lab Results Ready for ${pet.name}`;
      body = `The laboratory results for ${pet.name} are now available. Please contact us to discuss the findings and next steps.`;
      break;
    case 'follow-up':
      subject = `Follow-up Check for ${pet.name}`;
      body = `It's time for ${pet.name}'s follow-up visit. Please call us to schedule an appointment at your convenience.`;
      break;
    case 'overdue':
      subject = `Important: ${pet.name}'s Vaccination is Overdue`;
      body = `Our records show that ${pet.name} is overdue for a vaccination. Keeping vaccinations current protects your pet's health. Please schedule a visit soon.`;
      break;
  }

  const content = `COMMUNICATION TYPE: ${type.toUpperCase()}

TO: ${owner.name} (${owner.email})
PATIENT: ${pet.name}

SUBJECT: ${subject}

MESSAGE:
${body}

PREPARED FOR: Email
BEST TIME TO SEND: Business hours, Monday-Friday

IMPORTANT: This AI-generated communication draft should be reviewed and personalized by staff before sending to the client.`;

  return {
    id: id(),
    type: 'client-communication',
    title: `Client Communication — ${owner.name}`,
    content,
    confidence: 0.89,
    requiresReview: true,
    createdAt: now(),
    context: `Owner: ${owner.name}`,
  };
}

/* ── Business Insights ── */
export function generateBusinessInsight(
  totalRevenue: number,
  outstandingAmount: number,
  appointmentCount: number,
  completedAppointments: number,
  staffCount: number,
  petCount: number,
): AISuggestion {
  const completionRate = appointmentCount > 0 ? (completedAppointments / appointmentCount) * 100 : 0;
  const revenuePerAppt = appointmentCount > 0 ? totalRevenue / appointmentCount : 0;
  const outstandingPct = totalRevenue > 0 ? (outstandingAmount / (totalRevenue + outstandingAmount)) * 100 : 0;

  const insights: string[] = [];
  if (completionRate < 70) insights.push(`Appointment completion rate is ${completionRate.toFixed(0)}% — below the 70% target. Consider reminder calls/SMS 24h before appointments.`);
  if (outstandingPct > 15) insights.push(`Outstanding receivables at ${outstandingPct.toFixed(0)}% of total — above healthy threshold. Recommend follow-up with overdue accounts.`);
  if (revenuePerAppt < 150) insights.push('Average revenue per appointment is $' + revenuePerAppt.toFixed(0) + '. Consider promoting higher-value services or optimizing pricing.');
  if (staffCount > 0 && petCount / staffCount > 150) insights.push(`Patient-to-staff ratio is ${(petCount / staffCount).toFixed(0)}:1 — consider hiring to maintain service quality.`);
  if (insights.length === 0) insights.push('Key metrics are within healthy ranges. Continue monitoring trends over time.');

  const d = '$';
  const content = `BUSINESS INSIGHTS REPORT
Generated: ${new Date().toLocaleString()}

KEY METRICS
• Total revenue collected: ${d}${totalRevenue.toLocaleString()}
• Outstanding receivables: ${d}${outstandingAmount.toLocaleString()}
• Total appointments: ${appointmentCount}
• Completed appointments: ${completedAppointments}
• Appointment completion rate: ${completionRate.toFixed(1)}%
• Average revenue per appointment: ${d}${revenuePerAppt.toFixed(0)}
• Active staff: ${staffCount}
• Registered patients: ${petCount}
• Patient-to-staff ratio: ${staffCount > 0 ? (petCount / staffCount).toFixed(0) : 'N/A'}:1

INSIGHTS & RECOMMENDATIONS
${insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

TREND OBSERVATIONS
• Monitor revenue per appointment month-over-month for pricing optimization
• Track no-show and cancellation rates by day of week and time slot
• Review staff utilization to identify opportunities for efficiency gains
• Compare branch performance metrics for resource allocation insights

IMPORTANT: These AI-generated insights are based on current data snapshots. Management should validate findings with detailed analysis before making operational decisions.`;

  return {
    id: id(),
    type: 'business-insight',
    title: 'Business Insights Report',
    content,
    confidence: 0.84,
    requiresReview: true,
    createdAt: now(),
  };
}

/* ── Revenue Forecast ── */
export function generateRevenueForecast(historicalRevenue: { month: string; revenue: number }[]): AISuggestion {
  const avg = historicalRevenue.length > 0
    ? historicalRevenue.reduce((s, h) => s + h.revenue, 0) / historicalRevenue.length
    : 0;
  const trend = historicalRevenue.length >= 2
    ? (historicalRevenue[historicalRevenue.length - 1].revenue - historicalRevenue[0].revenue) / historicalRevenue.length
    : 0;

  const forecast = [1, 2, 3].map((m) => Math.round(avg + trend * m));
  const d = '$';

  const content = `REVENUE FORECAST — Next 3 Months
Generated: ${new Date().toLocaleString()}

HISTORICAL DATA
${historicalRevenue.map((h) => '• ' + h.month + ': ' + d + h.revenue.toLocaleString()).join('\n')}

STATISTICAL BASIS
• 6-month average: ${d}${avg.toLocaleString()}
• Monthly trend: ${trend >= 0 ? '+' : ''}${d}${trend.toFixed(0)}
• Trend direction: ${trend > 0 ? 'Growth' : trend < 0 ? 'Declining' : 'Stable'}

FORECAST
• Next month: ${d}${forecast[0].toLocaleString()}
• Month +2: ${d}${forecast[1].toLocaleString()}
• Month +3: ${d}${forecast[2].toLocaleString()}

FACTORS TO CONSIDER
• Seasonal patterns (holiday periods, vaccination seasons)
• Upcoming promotions or service expansions
• Staff changes affecting capacity
• Economic conditions affecting client spending

CONFIDENCE: ${Math.abs(trend) < avg * 0.05 ? 'High (stable trend)' : Math.abs(trend) < avg * 0.15 ? 'Moderate (some variability)' : 'Low (high variability)'}

IMPORTANT: This AI-generated forecast uses linear trend extrapolation and does not account for external market factors. Management should adjust based on known upcoming changes and seasonal patterns.`;

  return {
    id: id(),
    type: 'revenue-forecast',
    title: 'Revenue Forecast (3-Month)',
    content,
    confidence: 0.75,
    requiresReview: true,
    createdAt: now(),
  };
}

/* ── Inventory Forecast ── */
export function generateInventoryForecast(
  items: { name: string; stock: number; reorderLevel: number; unit: string; supplier: string }[],
): AISuggestion {
  const lowStock = items.filter((i) => i.stock <= i.reorderLevel);
  const critical = items.filter((i) => i.stock <= i.reorderLevel * 0.5);

  const content = `INVENTORY FORECAST & REORDER ALERTS
Generated: ${new Date().toLocaleString()}

CRITICAL STOCK (Immediate reorder required)
${critical.length > 0 ? critical.map((i) => `• ${i.name}: ${i.stock} ${i.unit} remaining (reorder at ${i.reorderLevel} ${i.unit}) — Supplier: ${i.supplier}`).join('\n') : 'No critical stock levels detected.'}

LOW STOCK (Reorder recommended)
${lowStock.length > 0 ? lowStock.map((i) => `• ${i.name}: ${i.stock} ${i.unit} (reorder level: ${i.reorderLevel} ${i.unit}) — Supplier: ${i.supplier}`).join('\n') : 'All items above reorder levels.'}

REORDER RECOMMENDATIONS
${lowStock.length > 0
    ? lowStock.map((i) => `• Order ${i.name}: Suggested quantity ${Math.ceil(i.reorderLevel * 2.5)} ${i.unit} from ${i.supplier}`).join('\n')
    : 'No reorders needed at this time.'}

DEMAND PREDICTION
Based on current consumption patterns:
• High-usage items should maintain 30-day buffer stock
• Seasonal items (flea/tick prevention) should be increased spring through fall
• Antibiotics and emergency medications should always maintain minimum buffer
• Vaccine stock should be ordered with 2-week lead time

SUPPLY CHAIN NOTES
• Verify supplier lead times before placing orders
• Consider bulk ordering for items with consistent demand
• Monitor expiry dates — avoid overstocking short-dated products

IMPORTANT: This AI-generated inventory forecast is based on current stock levels and standard reorder thresholds. The inventory manager should validate against actual usage rates and supplier lead times before ordering.`;

  return {
    id: id(),
    type: 'inventory-forecast',
    title: 'Inventory Forecast & Reorder',
    content,
    confidence: 0.87,
    requiresReview: true,
    createdAt: now(),
  };
}

/* ── Demand Prediction ── */
export function generateDemandPrediction(
  appointments: Appointment[],
  vaccinations: Vaccination[],
  surgeries: Surgery[],
): AISuggestion {
  const apptByDay: Record<string, number> = {};
  appointments.forEach((a) => { apptByDay[a.date] = (apptByDay[a.date] || 0) + 1; });
  const avgDaily = appointments.length / Math.max(Object.keys(apptByDay).length, 1);

  const surgeryCount = surgeries.length;
  const vaccineCount = vaccinations.length;

  const content = `DEMAND PREDICTION ANALYSIS
Generated: ${new Date().toLocaleString()}

CURRENT DEMAND PATTERNS
• Total appointments: ${appointments.length}
• Average daily appointments: ${avgDaily.toFixed(1)}
• Surgical procedures: ${surgeryCount}
• Vaccinations administered: ${vaccineCount}

PREDICTED DEMAND (Next 30 Days)
• Appointments: ${Math.round(avgDaily * 30)} (based on daily average)
• Surgical procedures: ${Math.round(surgeryCount * 0.4)} (estimated)
• Vaccinations: ${Math.round(vaccineCount * 0.3)} (estimated)

PEAK DEMAND PERIODS
• Monday mornings: High appointment volume (weekend backlog)
• Friday afternoons: Pre-weekend check-ups
• Spring/Summer: Increased vaccination and wellness visits
• Holiday periods: Boarding demand spikes

RESOURCE PLANNING RECOMMENDATIONS
${avgDaily > 10 ? '• Consider adding appointment slots or staff during peak hours' : '• Current capacity appears adequate for demand'}
${surgeryCount > 5 ? '• Ensure surgical suite availability 2-3 days per week' : '• Surgical schedule manageable with current capacity'}
• Maintain vaccine stock buffer for predicted demand
• Schedule grooming and boarding staff based on seasonal patterns

SERVICE DEMAND BY TYPE
${['Consultation', 'Vaccination', 'Surgery', 'Grooming', 'Boarding', 'Lab test'].map((s) => {
    const count = appointments.filter((a) => a.service?.includes(s)).length;
    return `• ${s}: ${count} appointments (${appointments.length > 0 ? ((count / appointments.length) * 100).toFixed(0) : 0}%)`;
  }).join('\n')}

IMPORTANT: This AI-generated demand prediction uses historical patterns and simple extrapolation. Actual demand may vary based on seasonal factors, marketing efforts, and external events.`;

  return {
    id: id(),
    type: 'demand-prediction',
    title: 'Demand Prediction (30-Day)',
    content,
    confidence: 0.76,
    requiresReview: true,
    createdAt: now(),
  };
}

/* ── Smart Search ── */
export function generateSmartSearch(query: string, db: {
  pets: Pet[]; owners: Owner[]; appointments: Appointment[]; invoices: Invoice[]; staff: Staff[];
}): AISuggestion {
  const q = query.toLowerCase();
  const petMatches = db.pets.filter((p) => p.name.toLowerCase().includes(q) || p.breed?.toLowerCase().includes(q) || p.species.toLowerCase().includes(q)).slice(0, 5);
  const ownerMatches = db.owners.filter((o) => o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.phone.includes(q)).slice(0, 5);
  const staffMatches = db.staff.filter((s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)).slice(0, 5);
  const apptMatches = db.appointments.filter((a) => a.service?.toLowerCase().includes(q) || a.status.toLowerCase().includes(q)).slice(0, 5);
  const invoiceMatches = db.invoices.filter((i) => i.number.toLowerCase().includes(q) || i.status.toLowerCase().includes(q)).slice(0, 5);

  const d = '$';
  const content = `SMART SEARCH RESULTS
Query: "${query}"

PATIENTS (${petMatches.length} found)
${petMatches.map((p) => `• ${p.name} — ${p.species}, ${p.breed || 'mixed'} (${ageYears(p.birthDate)}y, ${p.gender})`).join('\n') || 'No matches'}

OWNERS (${ownerMatches.length} found)
${ownerMatches.map((o) => `• ${o.name} — ${o.email} · ${o.phone}`).join('\n') || 'No matches'}

STAFF (${staffMatches.length} found)
${staffMatches.map((s) => `• ${s.name} — ${s.role} (${s.branch})`).join('\n') || 'No matches'}

APPOINTMENTS (${apptMatches.length} found)
${apptMatches.map((a) => `• ${a.date} ${a.time} — ${a.service} (${a.status})`).join('\n') || 'No matches'}

INVOICES (${invoiceMatches.length} found)
${invoiceMatches.map((i) => '• ' + i.number + ' — ' + i.status + ' (' + d + i.total + ')').join('\n') || 'No matches'}

SEARCH TIPS
• Search by name, breed, species, service type, or status
• Use partial matches — "rab" finds "Rabies" and "Rabbit"
• Invoice numbers and phone numbers are searchable

IMPORTANT: Smart search results are generated from current database records. Verify results by navigating to the relevant section for full details.`;

  return {
    id: id(),
    type: 'smart-search',
    title: `Search: "${query}"`,
    content,
    confidence: 0.95,
    requiresReview: false,
    createdAt: now(),
  };
}

/* ── Knowledge Base Assistance ── */
export function generateKnowledgeBaseAssistance(query: string): AISuggestion {
  const q = query.toLowerCase();
  let answer = '';

  if (q.includes('anesthesia') || q.includes('anesthetic')) {
    answer = `ANESTHESIA GUIDELINES

Pre-anesthetic protocol:
1. Pre-anesthetic blood work (CBC, biochemistry) within 30 days
2. Fasting: 6-8 hours (dogs), 8-12 hours (cats)
3. Pre-medication: acepromazine + opioid (e.g., methadone 0.2 mg/kg IM)
4. IV catheter placement and fluid support
5. Induction: propofol 4-6 mg/kg IV to effect
6. Maintenance: isoflurane or sevoflurane via endotracheal tube

Monitoring during anesthesia:
• ECG, SpO2, EtCO2, NIBP, temperature
• Record vital signs every 5 minutes
• Maintain body temperature with warming devices

Recovery:
• Monitor until fully sternal and responsive
• Provide pain management (multimodal analgesia)
• Check vital signs every 15 minutes for first hour`;
  } else if (q.includes('vaccination') || q.includes('vaccine')) {
    answer = `VACCINATION PROTOCOLS

Canine core vaccines:
• DHPP: 8, 12, 16 weeks, then annually or triennially
• Rabies: 12-16 weeks, then annually or triennially (per local law)

Feline core vaccines:
• FVRCP: 8, 12, 16 weeks, then annually
• Rabies: 12-16 weeks, then annually or triennially

Non-core (lifestyle-based):
• Bordetella: 2 weeks before boarding/grooming
• Leptospirosis: for outdoor/at-risk dogs
• FeLV: for outdoor cats or multi-cat households

Contraindications:
• Do not vaccinate sick or febrile patients
• Use caution in immunocompromised patients
• Document any adverse reactions in the record`;
  } else if (q.includes('pain') || q.includes('analgesia')) {
    answer = `PAIN MANAGEMENT PROTOCOLS

Multimodal analgesia approach:
1. NSAIDs: carprofen 2.2 mg/kg PO BID (dogs), meloxicam 0.05 mg/kg PO SID (cats — short course only)
2. Opioids: tramadol 2-5 mg/kg PO BID-QID, methadone 0.1-0.2 mg/kg IM q4-6h
3. Adjuncts: gabapentin 5-10 mg/kg PO BID, amantadine 3-5 mg/kg PO SID

Pain scoring:
• Glasgow Composite Pain Scale for acute pain
• Colorado State University scale for feline pain
• Reassess pain every 2-4 hours post-procedure

Contraindications:
• NSAIDs: avoid with renal disease, GI ulceration, or dehydration
• Opioids: use caution with brachycephalic breeds
• Always provide E-collar and cage rest post-surgery`;
  } else if (q.includes('dental') || q.includes('teeth')) {
    answer = `DENTAL PROCEDURE GUIDELINES

Pre-dental assessment:
1. Full oral examination (conscious if possible)
2. Pre-anesthetic blood work
3. Dental radiographs recommended under anesthesia

Grading:
• Grade 0: Normal, no treatment needed
• Grade 1: Gingivitis, scaling only
• Grade 2: Early periodontitis, scaling + root planing
• Grade 3: Established periodontitis, extractions may be needed
• Grade 4: Advanced periodontitis, multiple extractions likely

Post-dental care:
• Soft food for 3-5 days if extractions performed
• Home dental care: daily brushing, dental chews
• Recheck in 7-10 days if extractions performed
• Annual dental examination recommended`;
  } else {
    answer = `KNOWLEDGE BASE QUERY: "${query}"

This knowledge base covers common veterinary topics including:
• Anesthesia protocols and monitoring
• Vaccination schedules and guidelines
• Pain management and analgesia
• Dental procedures and oral health
• Emergency medicine and triage
• Surgical techniques and post-op care
• Diagnostic testing and interpretation
• Pharmacy and medication dosing
• Client communication best practices
• Practice management and operations

Please refine your query with more specific terms for a detailed response. For example:
• "anesthesia protocol for geriatric patients"
• "canine vaccination schedule"
• "pain management after surgery"
• "dental grading and treatment"

IMPORTANT: Knowledge base content is for reference only. Always consult current veterinary literature and guidelines for clinical decision-making.`;
  }

  const content = `KNOWLEDGE BASE ASSISTANCE
Query: "${query}"

${answer}

IMPORTANT: This AI-generated knowledge base response is for educational reference only. Always verify with current veterinary guidelines, drug formularies, and clinical protocols before applying to patient care.`;

  return {
    id: id(),
    type: 'knowledge-base',
    title: `Knowledge Base: ${query}`,
    content,
    confidence: 0.80,
    requiresReview: true,
    createdAt: now(),
  };
}
