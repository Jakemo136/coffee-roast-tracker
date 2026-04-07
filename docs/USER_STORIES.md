# User Stories — Coffee Roast Tracker

> Concrete interaction sequences for every form, modal, and
> multi-step flow. Each story maps to an integration or E2E test.

---

## Upload a Roast

### US-UP-1: Upload with bean match (happy path)
As a logged-in user, I want to upload a .klog file that matches
an existing bean so I can log my roast quickly.

1. I click "Upload" in the header
2. I see a modal with a dropzone saying "Drop your .klog file"
3. I drop a valid .klog file
4. I see a "Parsing..." indicator
5. I see "Parsed successfully" with roast date, duration, and DTR%
6. I see "Bean match found: [bean name]"
7. The Save Roast button is enabled
8. I type notes in the notes field — the text appears correctly
   without losing focus between keystrokes
9. I click Save Roast
10. The modal closes
11. I land on the new roast's detail page

**Test level:** Integration + E2E journey

### US-UP-2: Upload with no bean match — create bean inline
As a logged-in user, I want to upload a .klog file with no match
and create a full bean entry inline.

1. I click "Upload" in the header
2. I drop a .klog file with an unrecognized profile name
3. I see "No bean match" with a prominent "Add New Bean" button
   that looks like a CTA, not just text
4. I click "Add New Bean"
5. I see the Add Bean form with fields: name, origin, process,
   variety, supplier, score, and supplier description
6. I fill in name, origin, process, supplier
7. I enter a supplier description in the bag notes / description field
8. I paste cupping notes: "Bright with blueberry and honey, hints
   of dark chocolate"
9. I click "Parse Flavors"
10. I see matched pills: "Blueberry", "Honey", "Dark Chocolate"
11. I click Save on the bean form
12. The bean is created — the supplier and description I entered persist
13. I'm back in the upload modal with the new bean auto-selected
14. The Save Roast button is enabled
15. I click Save Roast
16. The modal closes and I land on the roast detail page
17. Navigating to the bean detail page shows supplier and description

**Test level:** Integration

### US-UP-3: Upload with no bean match — save without bean
As a logged-in user, I want to save a roast even without a bean
match, and assign the bean later.

1-3. Same as US-UP-2
4. I see an "Add Later" option alongside "Add New Bean"
5. I click "Add Later"
6. The Save Roast button becomes enabled
7. I click Save Roast
8. The roast is saved and I land on the roast detail page

**Test level:** Integration

### US-UP-4: Upload — file validation
As a user, I want clear feedback when I upload the wrong file type.

1. I open the upload modal
2. I select a .csv file
3. I see "Only .klog files are supported"
4. The modal stays open on the dropzone step

**Test level:** Integration (already covered, verify with schema-driven mock)

### US-UP-5: Upload — cancel at every step
As a user, I can exit the upload flow at any point without
side effects.

1. Open modal → close → no roast created
2. Upload file → see preview → close → no roast created
3. Upload file → open "Add New Bean" → cancel bean form →
   back to upload preview, no bean created
4. Upload file → open "Add New Bean" → fill form → close
   upload modal → both modals close, nothing created

**Test level:** Integration

### US-UP-6: Upload — notes field retains focus
As a user, I want to type multi-character notes without the
input losing focus.

1. Upload a file, see the preview
2. Click into the notes textarea
3. Type "Great first crack development"
4. The full text appears — no characters lost, cursor stays in field

**Test level:** Integration (regression test for focus trap bug)

---

## Add a Bean

### US-AB-1: Add bean from Bean Library (happy path)
As a logged-in user, I want to add a new bean with full details.

1. I click "Add Bean" on the Bean Library page
2. I see the Add Bean modal with required fields (name, origin,
   process) and optional fields (variety, supplier, score,
   supplier description)
3. I fill in name: "Colombia Huila", origin: "Huila, Colombia",
   process: "Washed"
4. I enter supplier: "Sweet Maria's"
5. I enter a supplier description
6. I enter score: 87.5
7. I paste cupping notes: "Stone fruit, cinnamon, brown sugar"
8. I click "Parse Flavors"
9. I see matched pills: "Stone Fruit", "Cinnamon"
   (or "No flavors matched" with guidance to add manually)
10. I click Save
11. The modal closes
12. The bean appears in my library

**Test level:** Integration

### US-AB-2: Add bean — required field validation
As a user, I should not be able to save a bean without required fields.

1. I open Add Bean modal
2. Save button is disabled
3. I fill in name only — Save still disabled
4. I fill in origin — Save still disabled
5. I fill in process — Save becomes enabled
6. I clear name — Save becomes disabled again

**Test level:** Integration (button state machine)

### US-AB-3: Add bean — flavor parsing with no matches
As a user, I want clear feedback when flavor parsing finds nothing.

1. I open Add Bean modal and fill required fields
2. I paste cupping notes: "xyzzy foobar nonsense text"
3. I click "Parse Flavors"
4. I see "No flavors matched — try different terms or add
   flavors after saving the bean."
5. I am NOT stuck — I can still save the bean without flavors

**Test level:** Integration

### US-AB-4: Add bean — score validation
As a user, I want to enter a numeric score.

1. I fill required fields
2. I type "not a number" in the score field
3. Score is ignored on save (or validation message shown)
4. I type "87.5" — accepted

**Test level:** Integration

---

## Roast Detail Editing

### US-RD-1: Edit notes inline
As the roast owner, I want to edit my roast notes.

1. I view my roast's detail page
2. I click "Edit" on the notes section
3. I see a textarea with my existing notes
4. I type new notes — focus is retained, text appears correctly
5. I click Save
6. The notes update in place
7. The toast confirms "Notes saved"

**Test level:** Integration

### US-RD-2: Toggle public/private
As the roast owner, I want to toggle my roast's visibility.

1. I see a "Public" or "Private" toggle with lock icon
2. I click it
3. The toggle switches state
4. A toast confirms "Roast is now [public/private]"
5. The button is disabled during the mutation (no double-click)
6. After the mutation, the button re-enables with the new state

**Test level:** Integration

### US-RD-3: Delete roast
As the roast owner, I want to delete my roast.

1. I click Delete
2. A confirmation dialog appears: "Are you sure? This roast will
   be permanently removed."
3. I click Confirm
4. I'm redirected to the dashboard
5. The roast is gone

**Test level:** Integration + E2E

### US-RD-4: Edit roast flavors
As the roast owner, I want to edit my roast's tasting notes.

1. I click "Edit Flavors" on roast detail
2. The flavor picker modal opens
3. I search for "Caramel" and select it
4. I click Save
5. The caramel pill appears on my roast
6. The toast confirms the change

**Test level:** Integration

---

## Multi-Page Journeys (E2E only)

### US-J-1: Upload → detail → compare
1. Upload a roast for Ethiopia Yirgacheffe
2. Land on roast detail
3. See "Other roasts of this bean" table
4. Select two roasts and click Compare
5. See overlaid chart on compare page

### US-J-2: Browse beans → detail → roast detail (logged out)
1. Land on landing page
2. Click a popular bean
3. See bean detail with roast history
4. Click a roast
5. See roast detail (read-only, no edit controls)

### US-J-3: Add bean → upload roast → verify bean data
1. Add a bean with supplier and description
2. Upload a roast, match to that bean
3. Navigate to bean detail
4. Verify supplier and description are displayed
