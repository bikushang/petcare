/* ════════════════════════════════════════════════════════════════════
   Blog articles — shared between the index and /site/blog/[slug].
   ────────────────────────────────────────────────────────────────────
   The index used to own this array privately and the cards had hover
   states but no link, because there was nowhere to link to. The array
   now lives here and carries the full body so the article route can
   render a real page.
   ════════════════════════════════════════════════════════════════════ */

import {
  Syringe, UtensilsCrossed, Dog, Cat, Sparkles, Bone, AlertTriangle, Bug,
  ScrollText, Stethoscope, HeartPulse, MapPin, type LucideIcon,
} from 'lucide-react';

export const CATEGORIES = [
  'Preventive care', 'Nutrition', 'Behaviour', 'Dentistry', 'Senior pets', 'Emergency',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ArticleSection = { heading: string; body: string[] };

export type Article = {
  /** Slug — used as the React key and as the `/site/blog/[slug]` segment. */
  id: string;
  title: string;
  excerpt: string;
  category: Category;
  author: string;
  authorRole: string;
  date: string;
  readMins: number;
  icon: LucideIcon;
  /** Opening paragraph on the article page, under the hero. */
  standfirst: string;
  sections: ArticleSection[];
  keyPoints: string[];
};

export const articles: Article[] = [
  {
    id: 'puppy-vaccines',
    title: 'The puppy vaccine schedule your vet actually follows',
    excerpt:
      'Core vaccines cover parvovirus, distemper, adenovirus and rabies, and the timing matters far more than the brand on the vial. Here is the schedule we run at Northgate, and why the final parvo booster has to land after 16 weeks of age.',
    category: 'Preventive care',
    author: 'Dr. Amara Rivera',
    authorRole: 'Clinical Director, DVM',
    date: '28 Sep 2026',
    readMins: 7,
    icon: Syringe,
    standfirst:
      'Almost every question we get about puppy vaccines is really a question about timing. The vaccines themselves are well understood and extremely effective; what decides whether a puppy is genuinely protected is when the last dose lands relative to their age, and how long you wait before the first walk in a public park.',
    sections: [
      {
        heading: 'Why maternal antibody dictates the schedule',
        body: [
          'A newborn puppy is protected by antibody absorbed from their mother\'s first milk. That borrowed immunity fades somewhere between six and sixteen weeks, and the exact week differs from litter to litter and even between siblings. While it is still present it also blocks a vaccine from working, because the maternal antibody neutralises the vaccine virus before the puppy\'s own immune system sees it.',
          'That is the whole reason a puppy course is a series rather than a single injection. We are not topping up a dose; we are making sure at least one injection arrives after the maternal antibody has gone. The final dose at or after sixteen weeks of age is the one that matters most, and it is the one most commonly skipped when a puppy changes hands at twelve weeks.',
        ],
      },
      {
        heading: 'The schedule we use',
        body: [
          'First visit at six to eight weeks: a full health examination, weight and body condition, a check for congenital problems such as heart murmurs, umbilical hernias and retained testicles, then the first DHPP dose covering distemper, hepatitis (adenovirus), parainfluenza and parvovirus. We worm at the same visit and start a weight-matched flea product.',
          'Second dose at ten to twelve weeks, third dose at fourteen to sixteen weeks. Rabies is given from twelve weeks as California law requires, and we add leptospirosis for dogs who swim or walk near standing water, plus kennel cough if the puppy will attend daycare, training classes or boarding.',
          'One booster at twelve to sixteen months, then core vaccines move to a three-year cycle. Rabies follows the state schedule, and lifestyle vaccines such as leptospirosis and kennel cough stay annual because immunity from those is genuinely shorter.',
        ],
      },
      {
        heading: 'Socialisation versus infection risk',
        body: [
          'The advice to keep a puppy indoors until fully vaccinated is well meant and, taken literally, causes more problems than it prevents. The behavioural window for socialisation closes around fourteen weeks, which is before the vaccine course finishes. A puppy who missed that window is at a far higher lifetime risk of fear-based behaviour than of parvovirus.',
          'What we recommend instead: carry your puppy in public from the first week home so they see traffic, crowds, umbrellas and other dogs at a distance. Visit friends with vaccinated, healthy adult dogs. Attend a properly run puppy class that requires proof of vaccination and disinfects floors between sessions. Avoid dog parks, communal grass verges and any area where you have no idea what has been there — those are the genuinely high-risk places, and you can wait a fortnight for them.',
        ],
      },
    ],
    keyPoints: [
      'The final puppy dose must land at or after sixteen weeks of age to be reliable.',
      'Maternal antibody blocks earlier doses, which is why the course is a series.',
      'Socialise from week one by carrying your puppy — do not wait for the last injection.',
      'Lifestyle vaccines are chosen from where your dog actually goes, not from a template.',
    ],
  },
  {
    id: 'how-much-food',
    title: 'How much should I actually be feeding my dog?',
    excerpt:
      'Feeding guides on the bag are written for intact, highly active adults, so most neutered pets need 20–30% less than the scoop suggests. We show you how to use a body condition score and a kitchen scale to get the portion right in a week.',
    category: 'Nutrition',
    author: 'Dr. Jonah Pike',
    authorRole: 'Senior Veterinarian, DVM',
    date: '22 Sep 2026',
    readMins: 6,
    icon: UtensilsCrossed,
    standfirst:
      'Roughly half the dogs we weigh at Northgate are carrying more weight than they should, and almost none of their owners are over-feeding on purpose. They are following the chart on the bag, which is the problem.',
    sections: [
      {
        heading: 'Why the bag over-feeds most dogs',
        body: [
          'Feeding guides are population averages built around an intact adult of average activity. Neutering reduces maintenance energy requirement by about twenty to thirty per cent, and most pet dogs get considerably less exercise than the average the chart assumes. Stack those two and the recommended portion can be a third more food than your particular dog needs.',
          'The guides are also given in volume rather than weight. A cup scooped loosely and a cup pressed down differ by a surprising margin, and kibble density varies hugely between brands. Weighing the food on a kitchen scale removes the single largest source of error in home feeding, and it takes about four seconds.',
        ],
      },
      {
        heading: 'Score the dog, not the bag',
        body: [
          'Body condition score is more useful than weight because it does not need a breed standard. Run your hands along the ribs: you should feel them easily, like the back of your hand, with a thin layer of covering and no need to press. Look from above and you should see a waist behind the ribs. Look from the side and the belly should tuck up towards the hind legs rather than running parallel to the floor.',
          'If you cannot feel ribs without pressing, your dog is overweight regardless of what the scale says. If the ribs are sharp and the spine is prominent, they are underweight. Score weekly, always by the same person, and write it down — memory is unreliable and progress over a month is invisible day to day.',
        ],
      },
      {
        heading: 'A practical week',
        body: [
          'Start by weighing exactly what you currently feed for three days, including every treat and the cheese the tablet goes in. Most owners are surprised: treats routinely account for fifteen to twenty-five per cent of daily calories. Then reduce the total by ten per cent, not more, and hold it for two weeks before reassessing.',
          'Weight loss should run at one to two per cent of body weight per week. Faster than that and you lose muscle alongside fat. Use some of the daily ration as training treats instead of adding food on top, and switch to low-calorie rewards — green beans, carrot, plain air-popped corn — for the dogs who need volume to feel rewarded.',
          'If the weight will not shift on a properly measured ration, come and see us. Hypothyroidism and Cushing\'s disease both cause stubborn weight gain, and both are straightforward blood tests.',
        ],
      },
    ],
    keyPoints: [
      'Weigh food on a kitchen scale; volume measures are the biggest source of error.',
      'Neutered dogs need roughly 20–30% less than the bag suggests.',
      'Count treats — they are often a fifth of daily calories.',
      'Aim for 1–2% body weight lost per week, and reassess fortnightly.',
    ],
  },
  {
    id: 'growling-groomer',
    title: 'Why your dog growls at the groomer — and what growling really means',
    excerpt:
      'A growl is information, not defiance: it is the warning that arrives before a bite, and punishing it only removes the warning. Learn the early signals most owners miss — lip licking, whale eye, a frozen tail — and how to rebuild clipper tolerance.',
    category: 'Behaviour',
    author: 'Dr. Hana Feldman',
    authorRole: 'Veterinarian, DVM',
    date: '16 Sep 2026',
    readMins: 8,
    icon: Dog,
    standfirst:
      'The most dangerous dog in a grooming salon is not the one who growls. It is the one who has been told off for growling often enough that they have stopped, and now go straight from stillness to teeth with nothing in between.',
    sections: [
      {
        heading: 'A growl is a sentence, not an insult',
        body: [
          'Dogs have a graded warning system. It starts with signals so subtle most people miss them entirely, escalates through stiffening and growling, and ends in a bite only when everything earlier has been ignored. A growl sits near the top of that ladder and means roughly: "I am not coping and I would like this to stop."',
          'Punishing the growl does not change how the dog feels about clippers. It teaches them that growling brings trouble, so they skip that rung. The underlying fear is untouched and the warning you relied on is gone. Every behaviourist you will ever meet would rather have a dog who growls.',
        ],
      },
      {
        heading: 'The signals that come first',
        body: [
          'Long before a growl you will usually see: a tongue flick when nothing has been eaten, a yawn when the dog is not tired, turning the head away while keeping the eyes on the handler (often with the whites visible at the corner — "whale eye"), a sudden shake-off as if wet, scratching that starts and stops, lifting a paw, or going very still with a tail held low and rigid rather than wagging loosely.',
          'None of those are dramatic, which is exactly why they get missed. If you learn to spot two or three of them you can end the session before it becomes frightening, and a session that ends calmly is the raw material for the next one going better.',
        ],
      },
      {
        heading: 'Rebuilding tolerance at home',
        body: [
          'Work in sessions of ninety seconds, several times a week, and never past the first sign of discomfort. Begin with the clippers switched off and across the room, paired with something genuinely good — not a biscuit, something your dog would cross a car park for. Over days, move the clippers closer. Only then switch them on, still at a distance.',
          'Next, touch your dog with the back of your hand where the clippers will eventually go, then with the body of the switched-off clippers, then with them running. Feet, face and tail come last because they are the places most dogs guard hardest. Expect the whole process to take weeks, and expect to go backwards if you rush.',
          'For dogs who are already frightened, ask us about a pre-groom anxiolytic. Medication is not a failure of training; it lowers the fear enough that training can actually happen. We also run two desensitisation visits with no cutting at all before any first groom with a nervous rescue, and they are free.',
        ],
      },
    ],
    keyPoints: [
      'Never punish a growl — you remove the warning, not the fear.',
      'Watch for lip licking, yawning, whale eye and shake-offs as earlier signals.',
      'Train in 90-second sessions and stop before your dog is uncomfortable.',
      'Ask about pre-visit medication for dogs who are already frightened.',
    ],
  },
  {
    id: 'brushing-cat-teeth',
    title: "Brushing your cat's teeth: a realistic 14-day plan",
    excerpt:
      'Around 80% of cats over the age of three already have periodontal disease, and daily brushing is still the single best defence at home. We break the habit into two-minute steps that begin with one finger and a dab of tuna water, not a toothbrush.',
    category: 'Dentistry',
    author: 'Priya Raman, RVT',
    authorRole: 'Lead Veterinary Nurse, RVT',
    date: '9 Sep 2026',
    readMins: 5,
    icon: Sparkles,
    standfirst:
      'Every owner who has tried to brush a cat\'s teeth by starting with a toothbrush has the same story. The plan below works because it spends the first week not going anywhere near the mouth.',
    sections: [
      {
        heading: 'Why it is worth the trouble',
        body: [
          'Plaque mineralises into calculus within about seventy-two hours, and once it has hardened no amount of brushing will shift it — that needs an ultrasonic scale under anaesthesia. Brushing works by interrupting plaque before it sets, which is why daily beats thorough. Three times a week is the minimum that makes a measurable difference; daily is roughly twice as effective.',
          'Periodontal disease is not only about teeth. The chronic bacterial load has documented associations with kidney and cardiac disease, and painful mouths quietly change how a cat eats, grooms and behaves long before an owner notices anything wrong.',
        ],
      },
      {
        heading: 'Days one to seven: build the habit, not the brushing',
        body: [
          'Days one and two: at a time your cat is already relaxed, dip one finger in tuna water or the juice from a pouch and let them lick it off. Thirty seconds, then stop. You are establishing that this ritual is good.',
          'Days three and four: same, but after they lick your finger, briefly touch the outside of their cheek. Days five to seven: slide the finger under the lip and touch the outer surface of the canine and the big cheek teeth. Still no toothbrush, still thirty to sixty seconds, still ending before your cat wants it to end.',
        ],
      },
      {
        heading: 'Days eight to fourteen: introduce paste and brush',
        body: [
          'Days eight to ten: swap tuna water for a veterinary enzymatic toothpaste — poultry or malt flavoured, never human toothpaste, which contains fluoride and sometimes xylitol. Use your finger to rub it along the outer gumline of a few teeth.',
          'Days eleven to fourteen: introduce a finger brush or a small, soft children\'s brush at a forty-five degree angle to the gumline, with small circular strokes. Only the outer surfaces matter; the tongue keeps the inner surfaces reasonably clean. Four or five seconds per side is a genuine win.',
          'If any day goes badly, drop back two steps rather than pushing through. And if the gums bleed readily, or your cat flinches hard on one side, stop and book a dental check — brushing an already painful mouth will undo everything.',
        ],
      },
    ],
    keyPoints: [
      'Plaque hardens in about three days, so frequency beats thoroughness.',
      'Spend the first week on the ritual, not the teeth.',
      'Use veterinary enzymatic paste — never human toothpaste.',
      'Only the outer tooth surfaces need brushing.',
    ],
  },
  {
    id: 'arthritis-signs',
    title: 'Arthritis in older dogs: the signs owners miss',
    excerpt:
      'Dogs rarely limp from arthritis until it is advanced — instead they slow on walks, hesitate at stairs and stop meeting you at the door. Catching it early means weight control and pain relief can buy years of comfortable mobility rather than months.',
    category: 'Senior pets',
    author: 'Dr. Jonah Pike',
    authorRole: 'Senior Veterinarian, DVM',
    date: '3 Sep 2026',
    readMins: 7,
    icon: Bone,
    standfirst:
      '"He is just getting old" is the single most expensive sentence in veterinary medicine. Slowing down is not a diagnosis; in a dog over seven it is usually osteoarthritis, and osteoarthritis is treatable.',
    sections: [
      {
        heading: 'What it actually looks like',
        body: [
          'Arthritis is bilateral far more often than not, which means there is no good leg to limp onto. Instead the dog redistributes effort, and what you see is a change in behaviour rather than gait: reluctance on stairs or into the car, sitting down halfway through a walk, no longer greeting you at the door, difficulty settling at night, licking over a joint, or a new grumpiness when touched over the hips or lower back.',
          'Sleeping more is the one owners dismiss most readily. A dog who used to wander between rooms and now stays on one bed has usually not become calmer; they have found the position that hurts least and stopped paying the cost of moving.',
        ],
      },
      {
        heading: 'The four things that help most',
        body: [
          'Weight comes first, and by a wide margin. Every kilogram over ideal loads every stride, and in trials weight reduction alone produced measurable lameness improvement without any medication. If your dog is overweight and arthritic, the single most effective treatment available to you is a kitchen scale.',
          'Second, pain relief. Modern veterinary NSAIDs and the monthly anti-nerve-growth-factor injections are both well tolerated with monitoring, and controlling pain lets a dog use the limb, which maintains the muscle that supports the joint. Never use human painkillers: ibuprofen and paracetamol cause ulceration and kidney injury in dogs, and paracetamol can kill a cat outright.',
          'Third, controlled exercise — little and often, on grass rather than pavement, beats one long weekend walk. Fourth, the environment: non-slip runners on hard floors, a ramp into the car, raised food bowls, and a thick orthopaedic bed away from draughts.',
        ],
      },
      {
        heading: 'When to come in',
        body: [
          'Bring your dog in if any of the behaviours above have appeared in the last six months. We examine every joint, watch the dog walk and trot, and usually radiograph the painful areas under sedation so the images are diagnostic rather than approximate.',
          'We also check bloods before starting any long-term anti-inflammatory, because kidney and liver function decide which drug is appropriate. From there you get a written plan with a weight target, a dose, an exercise prescription and a recheck date — typically four weeks, then quarterly.',
        ],
      },
    ],
    keyPoints: [
      'Arthritic dogs usually slow down rather than limp.',
      'Weight loss is the most effective single intervention available.',
      'Never give human painkillers — they cause ulceration and kidney injury.',
      'Non-slip flooring, ramps and a good bed change daily comfort more than owners expect.',
    ],
  },
  {
    id: 'toxins-ten-minutes',
    title: 'Chocolate, xylitol and grapes: what to do in the first ten minutes',
    excerpt:
      'With toxins, the dose and the clock decide the outcome, so phone us before you reach for the hydrogen peroxide. Keep the packaging, note the time and your pet’s weight, and one call will tell you whether this is watch-and-wait or drive-now.',
    category: 'Emergency',
    author: 'Dr. Amara Rivera',
    authorRole: 'Clinical Director, DVM',
    date: '27 Aug 2026',
    readMins: 4,
    icon: AlertTriangle,
    standfirst:
      'If you are reading this because something has just been eaten, stop and call us on +1 415 555 0100. Then come back. Everything below is better known before an emergency than during one.',
    sections: [
      {
        heading: 'The three facts we need on the phone',
        body: [
          'What, how much, and when. Keep the wrapper or packaging — the percentage of cocoa solids, or whether a sweetener is xylitol or sorbitol, changes the plan completely. Estimate the worst case rather than the likely case: if the bag held two hundred grams and you found half of it, assume one hundred grams went in.',
          'We also need your pet\'s weight, because toxicity is almost entirely dose-dependent. Forty grams of dark chocolate is a non-event for a Great Dane and a genuine emergency for a Chihuahua. If you do not know the weight, a rough figure is far better than none.',
        ],
      },
      {
        heading: 'Do not make your pet vomit at home',
        body: [
          'Hydrogen peroxide is widely recommended online and we see the consequences regularly: aspiration pneumonia, severe gastritis, and in several cases gastric ulceration worse than the original poisoning. Salt water is worse again and can cause life-threatening sodium elevation. Neither is safe without supervision.',
          'There are also substances where vomiting is actively harmful — anything caustic such as oven cleaner or descaler, and petroleum products, where bringing it back up risks it going into the lungs. We can induce vomiting safely and effectively with an injection, usually within a couple of minutes of you arriving, and we can give activated charcoal afterwards.',
        ],
      },
      {
        heading: 'The common ones, in order of how much they worry us',
        body: [
          'Xylitol is the one most owners underestimate. In dogs it triggers a massive insulin release and profound hypoglycaemia within thirty minutes, and higher doses cause acute liver failure. It is in sugar-free gum, some peanut butters, mints, protein bars and a few medications. Treat any xylitol ingestion as an emergency regardless of amount.',
          'Grapes, raisins, sultanas and currants cause acute kidney injury in dogs and there is no established safe dose — a handful of raisins has killed small dogs. Always an emergency. Lilies in cats are the equivalent: any part of the plant, including pollen groomed off the coat, can cause irreversible kidney failure.',
          'Chocolate depends on cocoa content; dark and baking chocolate are many times more toxic than milk. Rodenticides and antifreeze are both treatable with real urgency and essentially untreatable late. And human medication — ibuprofen, paracetamol, antidepressants, ADHD stimulants — accounts for a large share of what we actually see.',
        ],
      },
    ],
    keyPoints: [
      'Call first. Do not induce vomiting at home with peroxide or salt.',
      'Bring the packaging and an honest worst-case estimate of the amount.',
      'Xylitol, grapes and raisins, and lilies in cats are emergencies at any dose.',
      'Treatment is far more effective in the first hour than the third.',
    ],
  },
  {
    id: 'flea-tick-year-round',
    title: 'Flea and tick prevention that works year-round in the Bay Area',
    excerpt:
      'Our mild winters mean fleas never fully die off locally, so seasonal dosing leaves a gap that quietly restarts the life cycle. We compare oral, spot-on and collar products, and explain why treating bedding and carpet matters as much as treating the pet.',
    category: 'Preventive care',
    author: 'Dr. Mei-Lin Soto',
    authorRole: 'Veterinarian, DVM',
    date: '20 Aug 2026',
    readMins: 6,
    icon: Bug,
    standfirst:
      'Fleas are a household problem that happens to involve a pet. Until you accept that, you will keep treating the animal, keep seeing fleas, and keep assuming the product has failed.',
    sections: [
      {
        heading: 'Why the Bay Area has no flea season',
        body: [
          'Flea eggs, larvae and pupae need warmth and humidity, and our winters supply both indoors even when they do not outdoors. Central heating keeps a carpet at pupation temperature all year, which means the life cycle never properly breaks. Seasonal dosing from spring to autumn leaves a three or four month window in which a small surviving population rebuilds unnoticed.',
          'Ticks follow a similar pattern. Our coastal scrub and grassland support western black-legged ticks across most of the year, with activity peaks in the cooler, wetter months rather than high summer — the opposite of what most owners expect.',
        ],
      },
      {
        heading: 'Only five per cent of the problem is on your pet',
        body: [
          'An adult flea on a dog represents roughly five per cent of the household population. The other ninety-five per cent are eggs, larvae and pupae in carpet, upholstery, car boots and between floorboards. Pupae are the difficult stage: they are resistant to insecticide and can lie dormant for months, hatching in response to vibration and carbon dioxide — which is why a holiday home can feel like an ambush.',
          'So the environment needs treating alongside the pet. Vacuum thoroughly and often, paying attention to edges, under furniture and wherever the pet sleeps, and empty the cylinder outside. Wash bedding at sixty degrees. For established infestations, a household spray containing an insect growth regulator stops the immature stages developing, and that matters more than killing the adults you can see.',
        ],
      },
      {
        heading: 'Choosing a product',
        body: [
          'Oral isoxazolines given monthly or three-monthly kill fleas and ticks fast, cannot be washed off, and are our usual first choice for dogs that swim or are bathed often. Spot-on products are a good option for cats and for owners who cannot reliably give a tablet, but need twenty-four to forty-eight hours of no bathing and careful application to the skin rather than the coat.',
          'Long-acting collars suit pets whose owners struggle with monthly dosing, though they must be fitted properly and are not ideal for dogs who wrestle with other dogs. Whatever you choose, treat every pet in the household on the same day, every month, with a diary reminder — a missed month is how most reinfestations start.',
          'One genuine warning: never use a dog product on a cat. Permethrin-based spot-ons are safe for dogs and cause severe, sometimes fatal neurological signs in cats, and we see several cases a year.',
        ],
      },
    ],
    keyPoints: [
      'Dose every month all year — our winters do not break the flea life cycle.',
      '95% of a flea population is in your home, not on your pet.',
      'Use an insect growth regulator in the house for established infestations.',
      'Never apply a dog spot-on to a cat.',
    ],
  },
  {
    id: 'read-food-label',
    title: 'How to read a pet food label without the marketing',
    excerpt:
      'Ignore the front of the bag entirely and go straight to the AAFCO statement and the guaranteed analysis on the back. We show you how to tell a diet formulated and tested for your pet’s life stage from one that is merely labelled "complete".',
    category: 'Nutrition',
    author: 'Dr. Hana Feldman',
    authorRole: 'Veterinarian, DVM',
    date: '14 Aug 2026',
    readMins: 7,
    icon: ScrollText,
    standfirst:
      'The front of a pet food bag is advertising and is regulated loosely. The back is a legal document. Learning to read four specific things on the back tells you more than an hour of reading reviews.',
    sections: [
      {
        heading: 'One: the AAFCO nutritional adequacy statement',
        body: [
          'Somewhere on the back, usually in small type, is a sentence of the form "formulated to meet the nutritional levels established by the AAFCO Dog Food Nutrient Profiles for maintenance" or "animal feeding tests using AAFCO procedures substantiate that this food provides complete and balanced nutrition for growth".',
          'Two things matter in that sentence. "Formulated to meet" means the recipe was checked on paper; "animal feeding tests substantiate" means it was fed to animals and measured. The latter is stronger evidence. And the life stage — growth, maintenance, all life stages, gestation — must match your pet. A maintenance diet fed to a growing large-breed puppy is a genuine orthopaedic risk, not a technicality.',
          'If there is no AAFCO statement at all, the product is a treat or a complementary food, whatever the packaging implies, and should not be more than about ten per cent of the diet.',
        ],
      },
      {
        heading: 'Two and three: the ingredient list and the guaranteed analysis',
        body: [
          'Ingredients are listed by weight as they go into the mixer, which is why fresh meat often appears first — it is around seventy per cent water. Once cooked it contributes far less than the position suggests. "Chicken meal" sounds less appealing than "fresh chicken" but is the rendered, dried product and is more protein-dense by weight.',
          'The guaranteed analysis gives minimum protein and fat and maximum fibre and moisture, on an as-fed basis. Comparing a wet food at eight per cent protein with a dry at twenty-six per cent is meaningless until you convert both to dry matter: divide the nutrient by (100 − moisture) and multiply by 100. Done properly, that wet food is around thirty-two per cent protein, so it is the higher-protein diet of the two.',
          'Also look for a stated kilocalorie content per cup or per hundred grams. It is required on most labels now, and it is the only number that lets you compare portions honestly between brands.',
        ],
      },
      {
        heading: 'Four: who formulated it, and the claims to ignore',
        body: [
          'Good manufacturers will tell you, if asked, whether a qualified nutritionist formulated the diet, where it is made, and what quality control the plant runs. Those answers predict quality better than any ingredient on the label.',
          '"Grain free" is a marketing position rather than a health claim; true grain allergy is uncommon, and the FDA investigation into grain-free diets and dilated cardiomyopathy is unresolved. "Human grade", "holistic", "premium" and "natural" have little or no regulatory definition. "No by-products" excludes organ meats that are more nutritious than muscle. "Ancestral" or "biologically appropriate" are stories, not evidence.',
          'If your pet is well, their coat is good, their stools are consistent and their weight is stable on an AAFCO-complete diet appropriate for their life stage, you are doing it right — regardless of what the bag says on the front.',
        ],
      },
    ],
    keyPoints: [
      'Find the AAFCO statement and check that the life stage matches your pet.',
      'Feeding-trial substantiation is stronger evidence than formulation alone.',
      'Convert to dry matter before comparing wet and dry foods.',
      'Grain-free, holistic and human-grade are marketing terms, not health claims.',
    ],
  },
  {
    id: 'litter-box',
    title: 'Litter box problems are almost never spite',
    excerpt:
      'Urinating outside the box is a medical question first: a cat with cystitis, crystals or arthritic hips finds the box painful, unsafe or simply unreachable. Once we have ruled those out, box count, litter depth and location solve the large majority of the remaining cases.',
    category: 'Behaviour',
    author: 'Dr. Mei-Lin Soto',
    authorRole: 'Veterinarian, DVM',
    date: '7 Aug 2026',
    readMins: 6,
    icon: Cat,
    standfirst:
      'Inappropriate urination is the most common reason cats are surrendered to shelters, and the most commonly misread. Cats do not hold grudges about new jobs or new partners. They respond to pain and to an environment that no longer feels safe.',
    sections: [
      {
        heading: 'Rule out medicine before touching the litter',
        body: [
          'A cat with cystitis associates the box with pain and looks for somewhere that might hurt less, which is often a cool bath or a soft rug. Urinary crystals, bladder stones, a urinary tract infection, kidney disease, diabetes and hyperthyroidism all present this way. So does arthritis: a fifteen-year-old cat who stops climbing into a high-sided box is not protesting, they are struggling.',
          'A urine sample and a basic blood panel resolve most of this in a single visit. One red flag deserves naming: a male cat straining repeatedly and producing little or nothing is a blocked urethra, which is fatal within about forty-eight hours. That is an immediate emergency, day or night.',
        ],
      },
      {
        heading: 'Then the box itself',
        body: [
          'The rule of thumb is one box per cat plus one, in different rooms — not lined up side by side, which a cat reads as a single site. Boxes should be at least one and a half times the length of the cat, and most commercially sold boxes are too small for an adult.',
          'Most cats prefer unscented, fine-grained clumping litter at a depth of three to four centimetres, in an uncovered box. Hoods trap odour, restrict escape routes and are liked far more by owners than by cats. Scoop daily and wash with unscented soap weekly; skip the strongly perfumed cleaners entirely.',
          'Location matters as much as the box. Away from the washing machine and the boiler, out of a corridor where the dog walks past, not next to the food and water, and never in a spot where a cat can be cornered. Cats are prey animals in small spaces and will not use a toilet they cannot see out of.',
        ],
      },
      {
        heading: 'Spraying versus squatting',
        body: [
          'Spraying is different behaviour with a different cause: a standing cat, a quivering upright tail, a small volume on a vertical surface. It is territorial communication, usually triggered by another cat — including one outdoors through a window — or by change in the household.',
          'The fixes are different too. Block visual access to outdoor cats, use a pheromone diffuser, increase vertical space and separate resources so each cat has their own feeding and resting station. Clean soiled areas with an enzymatic cleaner, never anything ammonia-based, which smells like urine and invites a repeat. And for cats who are genuinely anxious, we can help with medication alongside the environmental work — it is not a last resort.',
        ],
      },
    ],
    keyPoints: [
      'Always rule out medical causes first — a straining male cat is an emergency.',
      'One box per cat plus one, in separate rooms, uncovered and large.',
      'Unscented fine clumping litter, 3–4 cm deep, scooped daily.',
      'Spraying is territorial and needs a different approach from squatting.',
    ],
  },
  {
    id: 'dental-under-ga',
    title: 'What actually happens during a dental under anaesthesia',
    excerpt:
      'Anaesthesia-free scaling polishes the part of the tooth you can see and misses the disease living under the gumline. Here is the full sequence we follow — pre-op bloodwork, intubation, full-mouth radiographs, charting, scaling, polishing and monitored recovery.',
    category: 'Dentistry',
    author: 'Priya Raman, RVT',
    authorRole: 'Lead Veterinary Nurse, RVT',
    date: '30 Jul 2026',
    readMins: 8,
    icon: Stethoscope,
    standfirst:
      'Owners worry about the anaesthetic and not about the dentistry, when the evidence points the other way: modern monitored anaesthesia is very safe, and untreated periodontal disease is painful for years.',
    sections: [
      {
        heading: 'Before the day',
        body: [
          'We examine the mouth awake to get a rough picture, then run pre-anaesthetic bloods — red cell count, kidney and liver values, and in older cats a thyroid level. Those results decide the drug protocol rather than simply clearing the pet for surgery, and they can be run the day before so nobody is waiting on a laboratory on the morning itself.',
          'Food is withheld from 22:00 the night before; water stays available until admission. Admission is between 8:00 and 8:30, and we spend fifteen minutes going through the consent form properly, including the realistic possibility of extractions, because we will not know what has to come out until the radiographs are on screen.',
        ],
      },
      {
        heading: 'The procedure itself',
        body: [
          'Premedication with sedation and pain relief, then an intravenous catheter and induction. The patient is intubated, which protects the airway from the water and debris that dental work generates, and placed on warmed intravenous fluids. A nurse — in our practice, usually me — stays with that patient from induction to recovery, recording blood pressure, ECG, oxygen saturation, end-tidal carbon dioxide and temperature every five minutes.',
          'Full-mouth radiographs come next, and they are the step that makes the difference. Around sixty per cent of what matters sits below the gumline: root abscesses, resorptive lesions in cats, bone loss, fractured roots and retained root tips. Without imaging you are guessing, and the guess is usually wrong.',
          'We then chart all forty-two teeth in a dog or thirty in a cat, probing pocket depths and recording mobility, before ultrasonic scaling above and below the gumline, root planing of any diseased pocket, and extractions where the tooth cannot be saved. Extraction sites are closed with absorbable sutures and given local anaesthetic blocks. Finally every tooth is polished, because scaling leaves microscopic scratches that plaque adheres to faster than enamel.',
        ],
      },
      {
        heading: 'Recovery and home care',
        body: [
          'Recovery happens on heat with a nurse present until the patient is sitting up and swallowing. We phone you as soon as your pet is awake, and discharge is usually between 16:00 and 17:30 with photographs of the mouth before and after, a marked-up dental chart, pain relief for several days, and clear instructions on soft food.',
          'Most pets eat the same evening. Animals with multiple extractions are often noticeably brighter within a week, which tells you how much low-grade pain they had been carrying. Then the home-care conversation starts, because a dental is a reset and not a cure — brushing, dental diets and chews decide how long it lasts.',
          'One point on anaesthesia-free dentistry: it removes visible calculus from the crown and nothing else. It does not probe, image, treat below the gumline or address pain, and it requires restraining a conscious animal with sharp instruments in its mouth. It makes teeth look better in photographs while the disease continues.',
        ],
      },
    ],
    keyPoints: [
      'Full-mouth radiographs are the step that finds the disease you cannot see.',
      'A dedicated nurse monitors anaesthesia continuously, not intermittently.',
      'Extractions are decided from imaging on the day, not guessed beforehand.',
      'Anaesthesia-free scaling treats appearance, not disease.',
    ],
  },
  {
    id: 'feline-kidney',
    title: 'Kidney disease in cats: catching it before stage three',
    excerpt:
      'By the time a cat is visibly drinking more, roughly two-thirds of kidney function has usually already gone. An annual SDMA blood test from age seven moves the diagnosis forward by months, when diet and fluid support still change the trajectory.',
    category: 'Senior pets',
    author: 'Dr. Jonah Pike',
    authorRole: 'Senior Veterinarian, DVM',
    date: '23 Jul 2026',
    readMins: 9,
    icon: HeartPulse,
    standfirst:
      'Chronic kidney disease affects a large share of cats over twelve, and it is almost always found later than it could have been. The reason is simple arithmetic: the markers we traditionally relied on do not move until most of the kidney is gone.',
    sections: [
      {
        heading: 'Why creatinine finds it late',
        body: [
          'Blood creatinine stays within the reference range until roughly seventy-five per cent of functioning kidney tissue has been lost. It is also affected by muscle mass, so an older cat losing condition can have a reassuring creatinine and significant disease at the same time.',
          'SDMA is a more sensitive marker and rises earlier, often when around forty per cent of function has gone, and it is not confounded by muscle loss. Combined with urine specific gravity — the kidney\'s ability to concentrate urine, which fails before blood values shift — and blood pressure and urine protein, it gives a usable picture a year or more before the classic presentation.',
          'That is the case for screening. From age seven we recommend an annual senior panel including SDMA, a urine sample and a blood pressure reading. From eleven, twice yearly.',
        ],
      },
      {
        heading: 'What you might notice at home',
        body: [
          'Drinking and urinating more, which in practice means heavier litter clumps and refilling the water bowl sooner. Gradual weight loss despite a reasonable appetite. A coat that looks unkempt because grooming has slowed. Occasional vomiting. Breath that smells unpleasant. Reduced appetite that comes and goes.',
          'Cats hide illness well, and all of this is easy to attribute to age. If you want one practical habit: weigh your cat every month on kitchen scales. A steady decline of a few hundred grams over six months is one of the earliest and most reliable signals there is, and it is invisible to the eye.',
        ],
      },
      {
        heading: 'What treatment achieves',
        body: [
          'Kidney tissue does not regenerate, so the goal is slowing progression and keeping the cat comfortable — and both are genuinely achievable. A renal diet with restricted, high-quality protein and controlled phosphate is the single intervention with the strongest survival evidence; studies show meaningfully longer life in cats who eat it. Transitioning slowly over several weeks matters, because a cat who refuses the diet gains nothing from it.',
          'Beyond diet: encourage water intake with fountains, wet food and multiple bowls away from feeding stations. Treat hypertension, which is common and damages kidneys, eyes and heart. Control urine protein loss with an ACE inhibitor or similar. Manage phosphate with binders when diet alone is not enough, and treat nausea and appetite loss actively rather than waiting — appetite stimulants and anti-nausea medication make a visible difference to quality of life.',
          'Many cats diagnosed early live comfortably for years on a routine of a prescription diet, a tablet or two and six-monthly bloods. That is a very different conversation from the one we have when a cat arrives dehydrated and inappetent in stage four, and the only variable that separates them is when we looked.',
        ],
      },
    ],
    keyPoints: [
      'Creatinine stays normal until ~75% of kidney function is lost; SDMA rises earlier.',
      'Screen annually from age seven, twice yearly from eleven.',
      'Monthly home weighing catches decline before anything looks wrong.',
      'A renal diet has the strongest survival evidence of any intervention.',
    ],
  },
  {
    id: 'microchip-missing',
    title: 'Microchips, ID tags and the 48 hours after a pet goes missing',
    excerpt:
      'A microchip only works if the registry holds a phone number you still answer, and most chips we scan are registered to an old address. Update yours in five minutes, then use our hour-by-hour checklist for the first two days of a search.',
    category: 'Preventive care',
    author: 'Dr. Amara Rivera',
    authorRole: 'Clinical Director, DVM',
    date: '15 Jul 2026',
    readMins: 5,
    icon: MapPin,
    standfirst:
      'We scan every stray brought to us. A clear majority have a chip, and a dispiriting number of those chips lead to a disconnected phone number or an address the family left years ago. A chip is not a tracker — it is a database entry, and the entry is your job.',
    sections: [
      {
        heading: 'Check your registration today',
        body: [
          'Find your chip number — it is on the implant paperwork, your pet\'s vaccination record, or we can scan it for free at either branch, no appointment needed. Then look it up on a chip registry checker, which tells you which database holds it.',
          'Log in and confirm your mobile number, an alternative contact who is not in your household, your current address and your email. Then do the same for any secondary registry, because pets rehomed or imported sometimes carry two records with conflicting details. Set a calendar reminder to repeat this annually, and update it the week you move rather than the month after.',
          'A chip is permanent identification but it is not visible. A collar tag is what gets a pet home in the first hour, because a neighbour can read it without going anywhere. Put your phone number on it, not your pet\'s name.',
        ],
      },
      {
        heading: 'The first two hours',
        body: [
          'Most lost cats are within a few houses of home, hiding and silent, and most lost dogs are moving. Search differently for each. For a cat, go out at night when it is quiet, with a torch to catch eye-shine, and check every shed, crawl space, garage, hedge and parked car underside within a hundred metres. Call briefly then stay silent and listen. Shake a biscuit box.',
          'For a dog, think about direction of travel and speed. Alert local people immediately, call the practices nearby including ours, and phone animal control and the local shelters rather than only checking their websites. Leave a worn item of your clothing and your pet\'s bed outside your door; scent brings animals back more reliably than calling does.',
        ],
      },
      {
        heading: 'Hours two to forty-eight',
        body: [
          'Post to the neighbourhood groups that people in your area actually use, with a clear recent photo, the area, your phone number and whether your pet is nervous of strangers. Ask people to report sightings rather than chase. Put physical posters at eye level on the junctions nearest home — drivers and walkers see those, and they reach the people who are not online.',
          'Call every shelter and veterinary practice within ten miles daily, by phone, and visit the municipal shelter in person at least every other day: descriptions get logged inaccurately and staff change shifts. Check the found listings as well as posting a lost one.',
          'Keep going past the first week. We regularly scan cats reunited after a month or more, and the thing that makes it possible is almost always a chip record with a number someone still answers.',
        ],
      },
    ],
    keyPoints: [
      'Verify your microchip registry details today, and after every move.',
      'A visible collar tag with your phone number gets pets home fastest.',
      'Lost cats hide close by; lost dogs travel. Search accordingly.',
      'Phone shelters and practices daily and visit in person — do not rely on websites.',
    ],
  },
];

export function findArticle(slug: string): Article | undefined {
  return articles.find((a) => a.id === slug);
}

/** Up to `limit` other articles, preferring the same category. */
export function relatedArticles(slug: string, limit = 3): Article[] {
  const current = findArticle(slug);
  if (!current) return articles.slice(0, limit);
  const sameCategory = articles.filter((a) => a.id !== slug && a.category === current.category);
  const rest = articles.filter((a) => a.id !== slug && a.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}

export function matchesArticle(a: Article, category: string, query: string): boolean {
  if (category !== 'All' && a.category !== category) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    a.title.toLowerCase().includes(q) ||
    a.excerpt.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q) ||
    a.author.toLowerCase().includes(q)
  );
}

/** Initials for an author byline — strips the "Dr." and any trailing credential. */
export function authorInitials(name: string): string {
  return name
    .replace(/^Dr\.\s*/, '')
    .replace(/,.*$/, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
