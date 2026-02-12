// Structured content for performance description pages
// Content scraped from halimmadi.com

type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'image'; hash: string; filename: string; alt: string }
  | { type: 'video'; hash: string; filename: string }
  | { type: 'gallery'; items: { hash: string; filename: string; alt: string }[] };

export interface PerformanceDescription {
  title: string;
  date: string;
  location: string;
  series: string;
  liveUrl: string;
  datasetUrl: string;
  content: ContentBlock[];
}

function cargoImg(hash: string, filename: string, width = 1500): string {
  return `https://freight.cargo.site/w/${width}/i/${hash}/${filename}`;
}

export { cargoImg };

const descriptions: Record<string, PerformanceDescription> = {
  'carnation-exe': {
    title: 'Carnation.exe',
    date: "May '25",
    location: 'European Artist Program, Paris, Barcelona',
    series: 'Part I of Singulars',
    liveUrl: 'https://carnation-eng.vercel.app/',
    datasetUrl: 'https://huggingface.co/datasets/madihalim/carnation-fr',
    content: [
      {
        type: 'image',
        hash: 'K2586476299518304130969389847395',
        filename: 'IMG_8458.JPG',
        alt: 'Carnation.exe performance installation with printed poems displayed side by side',
      },
      {
        type: 'paragraph',
        text: 'Carnation.exe begins with the story of AlphaGo and Lee Sedol. In that match, creativity didn\u2019t come from mastery alone but from confrontation. Sedol\u2019s \u201cGod move\u201d unmoored the machine, and AlphaGo\u2019s reply revealed something alien. This is the heart of the work: poetry born not in solitude but in encounter. Rivalry as intimacy. Losing as memory. Each exchange a gift.',
      },
      {
        type: 'paragraph',
        text: 'In the performance, a human poet and a language model trained only on poetry face one another. Each day a theme (loss, longing, arrival) is chosen. The poet has thirty minutes. The model responds in seconds. Both poems are printed and placed side by side. Visitors read and vote by placing a pink dot beneath the piece that moved them most. The pink carnation, in English, means: I will never forget you.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'Y2586477661662780021830100276067', filename: 'IMG_8498.JPG', alt: 'Close-up of printed poems with pink voting dots' },
          { hash: 'X2586477713959299470796679107427', filename: 'IMG_8497.JPG', alt: 'Audience reading printed poems during the performance' },
          { hash: 'L2586478123126529769748243501923', filename: 'IMG_8478.JPG', alt: 'Poems displayed on the wall with visitor votes' },
        ],
      },
      {
        type: 'italic',
        text: 'The essence of sports is not winning, but losing. Losing as a gift. The loser says to the winner, I will never forget you. And the winner, in turn, devours the memory of the loser, metabolizes them, carries them forward.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'A2586477290643416467309888623459', filename: 'IMG_8470.JPG', alt: 'Performance documentation showing the poet writing' },
          { hash: 'P2586477339139906637092299821923', filename: 'IMG_8474.JPG', alt: 'Printed poems being placed for audience viewing' },
          { hash: 'O2586480870197210482500960605027', filename: 'IMG_8490.JPG', alt: 'Audience interacting with the installation' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Votes decide not just a winner but the next stage of learning. If the poet wins, their words are added to the training corpus. If the machine wins, the poet studies its work, borrowing from its strangeness. The cycle repeats. Over time, both evolve, shaped by each other, and by the audience who becomes the hidden trainer.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'J2586480587851345690302563570531', filename: 'IMG_8481.JPG', alt: 'Detail of pink voting stickers on printed poems' },
          { hash: 'K2586480654370304820099206697827', filename: 'IMG_8488.JPG', alt: 'Overview of the Carnation.exe installation space' },
          { hash: 'U2586481015096385181489488548707', filename: 'IMG_8494.JPG', alt: 'Close-up of handwritten and machine-generated poems' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Carnation.exe is not about proving superiority. It stages an ecology of feedback, a ritual of exchange, a flower passed between mouths. A duel that is also a dance. Whether human or machine \u201cwins,\u201d what endures is the trace\u2009\u2014\u2009the memory of the poem, the pink mark of attention, the vow not to forget.',
      },
    ],
  },

  'versus-exe': {
    title: 'Versus.exe',
    date: 'Nov 25',
    location: 'Mozilla AI Residency, San Francisco',
    series: 'Part II of Singulars',
    liveUrl: 'https://versus-eta.vercel.app/',
    datasetUrl: 'https://huggingface.co/datasets/madihalim/v2-versus-eng',
    content: [
      {
        type: 'paragraph',
        text: 'Versus.exe grows out of the same soil where Carnation.exe first took root. In that earlier match, the poet and the model circled each other like two creatures sensing a future they did not yet know how to share.',
      },
      {
        type: 'paragraph',
        text: 'The performance begins with a prompt: arrival, anger, joy, shame, or solitude. The model responds immediately; the poet takes thirty minutes. Two poems are printed side-by-side. Visitors vote with colored markers, their choices becoming \u201cselection pressure\u201d that influences both the poet\u2019s and model\u2019s future iterations.',
      },
      {
        type: 'paragraph',
        text: 'There is a soft humiliation in losing to the machine. The poet spends half an hour crafting each piece while the model generates its response in seconds. But this dynamic is the medium itself. Fine tuning as craft. Iteration as sculpture. The work investigates how judgment transforms into learning, learning into taste, and taste into evolution.',
      },
      {
        type: 'image',
        hash: 'L2651923156110863383776773624675',
        filename: 'IMG_9920.JPG',
        alt: 'Versus.exe performance at Mozilla AI Residency, San Francisco',
      },
      {
        type: 'paragraph',
        text: 'In some sessions, the circle widens. Guest poets including Elise Liu and Theory have participated, introducing varied linguistic and emotional registers that shift audience response patterns across different languages \u2014 Arabic, French, English, Spanish.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'U2651930032743459413444553692003', filename: '2831d8c8-b769-4e0d-ba6c-c1c838b4d131.JPG', alt: 'Audience voting during the Versus.exe performance' },
          { hash: 'L2651928450750687652113407103843', filename: 'IMG_1738.JPG', alt: 'Printed poems displayed for audience reading' },
          { hash: 'B2651928763902615047406755337059', filename: 'IMG_1718.JPG', alt: 'Close-up of voting stickers on poems' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Rather than collaboration, Versus.exe represents fine tuning as craft and iteration as sculpture. Behind the scenes, dashboards track votes, themes, and decision patterns within the model\u2019s probability distributions. Each audience vote influences future iterations \u2014 winning human poems enter the training corpus, while successful model outputs become lessons for the poet.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'H2651928886887057786828335960931', filename: 'IMG_1714.JPG', alt: 'Performance documentation' },
          { hash: 'I2651929209520611636008393724771', filename: 'IMG_1700.JPG', alt: 'Poet writing during the performance' },
          { hash: 'S2651929377976278517124019082083', filename: 'IMG_1694.JPG', alt: 'Audience engaging with printed poems' },
          { hash: 'V2651929601753730875294589735779', filename: 'IMG_1685.JPG', alt: 'Installation overview' },
          { hash: 'D2651926755421120301910775386979', filename: 'IMG_9911.JPG', alt: 'Detail of poems on display' },
        ],
      },
      {
        type: 'paragraph',
        text: 'Human participants experience what the artist calls \u201csoft humiliation\u201d when losing to the machine \u2014 spending hours crafting poetry only to be outpaced by automated generation, yet recognizing this technological dynamic as the medium itself.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'J2651926755642481230795290006371', filename: 'IMG_9912.JPG', alt: 'Printed poem sheets with audience votes' },
          { hash: 'L2651926755660927974868999557987', filename: 'IMG_9913.JPG', alt: 'Voting stickers close-up' },
          { hash: 'Z2651926755679374718942709109603', filename: 'IMG_9915.JPG', alt: 'Poems displayed on the wall' },
          { hash: 'U2651926755697821463016418661219', filename: 'IMG_9916.JPG', alt: 'Performance space overview' },
          { hash: 'K2651927273940649469812561761123', filename: 'IMG_9917.JPG', alt: 'Audience reading poems' },
        ],
      },
      {
        type: 'italic',
        text: 'Human and machine become altered through their encounter, much like a mother altered by the milk she gives.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'U2651927538264045301996726866787', filename: 'IMG_9921.jpg', alt: 'Final installation view' },
          { hash: 'K2651927964715874798014141125475', filename: 'IMG_9940.jpg', alt: 'Documentation of the performance series' },
          { hash: 'G2651928122656897557115322061667', filename: 'IMG_9925.jpg', alt: 'Close-up of the performance materials' },
        ],
      },
    ],
  },

  'reinforcement-exe': {
    title: 'Reinforcement.exe',
    date: 'Nov 25',
    location: 'ARG Ethereum Scholar Program, DevConnect Buenos Aires',
    series: 'Part III of Singulars',
    liveUrl: 'https://reinforcement-lime.vercel.app/',
    datasetUrl: 'https://huggingface.co/datasets/madihalim/v3-reinforcement-eng',
    content: [
      {
        type: 'paragraph',
        text: 'Reinforcement.exe takes place inside an open cube. The poet enters as if stepping into a small world carved out of time. For two hours each day, they write a new poem every thirty minutes. No breaks. No drift. A metronome of attention. A ritual of effort. The machine waits beside them, training on the growing archive of their voice.',
      },
      {
        type: 'image',
        hash: 'Z2682094116426327375476450218851',
        filename: '_MG_5037.jpg',
        alt: 'The open cube installation where the poet writes during Reinforcement.exe',
      },
      {
        type: 'paragraph',
        text: 'Each cycle begins with a blank page. The poet writes. The model generates its answer. Two texts emerge from the same seed. Both are printed on warm paper and placed before the audience like offerings. Red stickers mark the machine. Blue stickers mark the human. The votes pile up in patterns that feel almost biological. A cluster of red. A cluster of blue. A cluster of confusion where the votes intermingle.',
      },
      {
        type: 'image',
        hash: 'U2682094274422690366798759809891',
        filename: '_MG_5036.jpg',
        alt: 'Printed poems with red and blue voting stickers from audience',
      },
      {
        type: 'paragraph',
        text: 'These stickers are not decoration. They are reinforcement. They sculpt the machine by telling it what pleases. They sculpt the poet by telling them where their craft falters. The loop tightens each day. The model evolves through gradients of approval. The poet evolves through gradients of shame and surprise. A small crowd becomes the unseen trainer of both.',
      },
      {
        type: 'image',
        hash: 'A2682094523859563731499316761443',
        filename: 'DSC01755.jpg',
        alt: 'Audience voting with colored stickers during the performance',
      },
      {
        type: 'paragraph',
        text: 'Reinforcement.exe is part of the ARG Ethereum Scholar Program. It unfolds in Buenos Aires during DevConnect, surrounded by technologists, coders, cryptographers, dreamers, skeptics, and the hum of a city that treats invention as a kind of hunger. The project remains ongoing, a continuous experiment in living feedback. A performance that refuses to end at the level of spectacle. The cube becomes a workshop, a pressure chamber, a small factory where taste is forged in public.',
      },
      {
        type: 'image',
        hash: 'X2682094696207493612167657509731',
        filename: 'IGAC-exhibition-photography-048.jpg',
        alt: 'The performance cube at DevConnect Buenos Aires',
      },
      {
        type: 'paragraph',
        text: 'Inside the cube, something subtle breaks open. The poet begins to see their own gestures reflected back at them in strange distortions. A line they wrote four days earlier returns in the mouth of the model wearing a new mood. A metaphor they abandoned resurfaces sharpened. Sometimes the machine writes the better poem. Sometimes the human does. The point is not victory. The point is the slow emergence of a third voice produced by collision.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'O2682097520570031993763395883875', filename: 'Untitled-2-01.jpg', alt: 'Performance detail' },
          { hash: 'Y2682097520754499434500491400035', filename: 'Untitled-2-02.jpg', alt: 'Performance detail' },
          { hash: 'O2682097520772946178574200951651', filename: 'Untitled-2-03.jpg', alt: 'Performance detail' },
          { hash: 'O2682097520791392922647910503267', filename: 'Untitled-2-04.jpg', alt: 'Performance detail' },
          { hash: 'U2682097520809839666721620054883', filename: 'Untitled-2-05.jpg', alt: 'Performance detail' },
          { hash: 'J2682097520828286410795329606499', filename: 'Untitled-2-06.jpg', alt: 'Performance detail' },
          { hash: 'C2682097520846733154869039158115', filename: 'Untitled-2-07.jpg', alt: 'Performance detail' },
          { hash: 'L2682097520865179898942748709731', filename: 'Untitled-2-08.jpg', alt: 'Performance detail' },
        ],
      },
      {
        type: 'paragraph',
        text: 'There are moments of humiliation. The poet writes for half an hour and the model generates something cleaner. Something colder. Something that hits the room with unexpected force. The poet wonders why they keep doing this. Why they spend hours feeding a system that keeps learning faster than they can. Then the answer arrives. This is the medium. Fine tuning as composition. Reinforcement as choreography. A poem built through many acts of judgment.',
      },
      {
        type: 'paragraph',
        text: 'The work becomes even stranger when the poet tries to push the model beyond politeness. They learn to tune it into states of trembling. They whisper prompts that ask it to go wild, to seek salvation in the lexicons of the poets it once skimmed, to reject citation, to stand on its own voice. The softmax shifts. The temperature climbs. Something new arrives on the page that feels half metal and half breath.',
      },
      {
        type: 'image',
        hash: 'C2682095106020359953699056210787',
        filename: 'IGAC-exhibition-photography-049.jpg',
        alt: 'Close-up of printed poems accumulating during the performance',
      },
      {
        type: 'paragraph',
        text: 'Printed poems pile up. Sheets accumulate like sedimentary layers of a psychological dig. A dashboard records the votes. The losses. The brief victories. The micro oscillations of style. Once in a while the poet stops and sees the stack of poems the machine has absorbed. A clone growing in real time. Not money laundering for copyrighted text but a form of explicit self replication. The poet teaches the machine to sound more like them. Then the machine teaches the poet to sound more like someone who can survive the future.',
      },
      {
        type: 'paragraph',
        text: 'Reinforcement.exe belongs to the same lineage as Carnation.exe and Versus.exe. Together they form Singulars, a long inquiry into what it means for a human and a machine to share a craft. Each installment approaches the question from a different angle. Confrontation. Comparison. Training. Each reveals how influence flows in both directions. The human is not replaced. The machine is not crowned. Instead there is a slow emergence of a hybrid aesthetic shaped by contact.',
      },
      {
        type: 'paragraph',
        text: 'There is a line the poet returns to often. Half flesh half metal. Half iron half heart. It feels like the secret skeleton of Reinforcement.exe. A reminder that the point is not to prove who writes better. The point is to witness how two intelligences can change one another when placed in a loop of attention. What endures is the trace of each vote. The warmth of each printed page. And the slow awakening of a style held between two minds.',
      },
      {
        type: 'gallery',
        items: [
          { hash: 'Y2682096433946125587828548391779', filename: 'L1002255.jpg', alt: 'Final installation view at DevConnect Buenos Aires' },
          { hash: 'G2682096571245241728448741069667', filename: 'L1001674.jpg', alt: 'Documentation of the Reinforcement.exe performance' },
          { hash: 'V2682096736011559794822456103779', filename: 'L1002259.jpg', alt: 'Overview of the performance space' },
        ],
      },
    ],
  },
};

export function getPerformanceDescription(slug: string): PerformanceDescription | null {
  return descriptions[slug] || null;
}

export function hasDescription(slug: string): boolean {
  return slug in descriptions;
}
