// ============================================================
//  ASHFALL — story.js
//  All the writing lives here. Change it freely; nothing
//  else in the game cares what these strings say.
// ============================================================
'use strict';

const STORY = {
  title: 'ASHFALL',
  subtitle: 'a lantern in the hollow',

  intro: [
    'The sun did not fall. It closed, the way a hand closes.',
    'Everything that was bright went down into the earth and pooled there, in the Hollow.',
    'Four hundred years later, one lamp still burns.',
    'You are the last Lamplighter. Carry the spark home.',
  ],

  controls: [
    'A / D  —  walk',
    'SPACE  —  jump',
    'SHIFT  —  dash',
    'R  —  restart chapter     ESC  —  pause',
  ],

  chapters: [
    // ----------------------------------------------------
    // I
    // ----------------------------------------------------
    {
      name: 'I',
      title: 'The Waking Dark',
      intro: [
        'You wake where the light pooled.',
        'The Hollow is quiet, and the quiet has weight.',
        'Somewhere above, the wick you were meant to hold is waiting.',
      ],
      tablets: [
        'The first light was not made. It was found — caught in a river of stone, carried home in a cupped hand.',
        'We kept the lamps burning for the ones who had not yet come down.',
        'When the last wick went out, the dark did not rush in. It settled. Like snow.',
        'Lamplighter, if you are reading this, you are already too late. Go anyway.',
      ],
      clear: [
        'The brazier catches.',
        'Far below, something answers with a small light of its own.',
      ],
    },

    // ----------------------------------------------------
    // II
    // ----------------------------------------------------
    {
      name: 'II',
      title: 'Root and Ruin',
      intro: [
        'The orchard grew down instead of up.',
        'Its roots are still reaching for a sun they remember.',
        'Gaps here are wider than your legs can carry you. The spark remembers how to move.',
      ],
      tablets: [
        'The trees were buried standing. Their shadows kept growing for a hundred years.',
        'A dash is not speed. It is the spark refusing, for one moment, to be slowed by the world.',
        'We fed the roots with lamp oil. It seemed kinder than the alternative.',
      ],
      clear: [
        'The roots pull back from your light like a hand from a stove.',
        'Something under the bark says your name. You do not answer.',
      ],
    },

    // ----------------------------------------------------
    // III
    // ----------------------------------------------------
    {
      name: 'III',
      title: 'The Weeping Halls',
      intro: [
        'Rain falls here and never lands.',
        'It hangs in the dark, waiting for a place to be finished.',
        'The walls are close, and they are the only road up.',
      ],
      tablets: [
        'The Halls were built for a festival. The rain came and never got the message.',
        'Hold a wall and you will slow. Kick away from it and you will climb. Nothing is wasted if you push.',
        'We hung lanterns from the rafters so the drowning would have something to look at.',
      ],
      clear: [
        'The last brazier coughs once, then remembers how to be fire.',
        'The rain falls upward through the ceiling. You watch it leave.',
      ],
    },

    // ----------------------------------------------------
    // IV
    // ----------------------------------------------------
    {
      name: 'IV',
      title: 'Ascent of Cinders',
      intro: [
        'Above the Halls is a chimney, and above the chimney is weather.',
        'The platforms here are the lids of things that died breathing.',
        'You are nearly out. Nearly is the longest word in the Hollow.',
      ],
      tablets: [
        'Ash is only light that has finished being light.',
        'A second jump is a second chance. Do not spend yours on the same ledge twice.',
        'The surface is not a place. It is a direction.',
      ],
      clear: [
        'Wind. Actual wind, cold and stupid and alive.',
        'You climb out onto a plain of grey with one last stair in the middle of it.',
      ],
    },

    // ----------------------------------------------------
    // V
    // ----------------------------------------------------
    {
      name: 'V',
      title: 'The Last Lamp',
      intro: [
        'There is no sun.',
        'There is only the place where the sun used to be, and a wick the size of a heartbeat.',
        'Everything you have been carrying, you were carrying here.',
      ],
      tablets: [
        'This is the socket the world was screwed into.',
        'Every lamp you lit on the way down is still burning. We can see them from here.',
        'Do not be afraid of the size of your light. It is enough. It has always been enough.',
      ],
      clear: [
        'You light it.',
        'The sky does not open. It simply remembers that it can.',
      ],
    },
  ],

  // shown when an ability is first unlocked
  unlocks: {
    dash:   'THE SPARK REMEMBERS:  SHIFT to dash',
    wall:   'THE SPARK REMEMBERS:  hold a wall, then jump off it',
    double: 'THE SPARK REMEMBERS:  jump once more in mid-air',
  },

  ending: [
    'Far below, in the Hollow, a hundred small lights answer yours.',
    'The roots let go. The rain finishes falling. The trees turn, slowly, the way trees should.',
    'You sit down in the ash and watch the sky do the thing it was built to do.',
    'The last Lamplighter does not need a lantern anymore.',
  ],

  endingFoot: 'ASHFALL — thank you for playing.  ENTER to return to the dark.',
};

// Small helper so the renderer can ask for one wrapped block
// without knowing anything about the story's shape.
STORY.chapter = function (i) {
  return STORY.chapters[clamp(i, 0, STORY.chapters.length - 1)];
};
