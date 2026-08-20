# CALOREAZI 1.2.0

## Experience

- Rebuilt history as a vertical, color-coded timeline with time, meal type and saved images.
- Redesigned today's meals with chronological ordering, time, meal type and cleaner visual hierarchy.
- Replaced the coach connection tile with a useful daily coach recommendation.
- Improved mobile typography and form readability.
- Changed Admin navigation to clear rectangular tabs and fixed clipped tab controls.

## Food library

- Changed the inline food strip into a dedicated library tile and management window.
- Added owner-authorized editing and removal of catalog foods.
- Added mango, plum, melon, grapefruit, watermelon, kiwi and peach, plus zucchini, eggplant, cauliflower and sweet potato.

## Reliability

- Fixed Gemini image generation to use the supported `generateContent` image contract and parse inline image output.
- Allow catalog fallback artwork to be saved when an AI image is unavailable.
- Refresh application state after manual mutations and whenever the app regains focus.
- Added an automated Gemini image adapter regression test.
