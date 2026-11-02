# Scope of Work and Implementation Plan

## Indian Sign Language (ISL) Communication Assistant --- Hackathon MVP

**Document type:** Scopee of Work (SOW)\
**Platform:** Responsive web application\
**Target vocabulary:** 30--50 validated ISL signs\
**Speech caption languages:** English and Hindi\
**Gesture scope:** Static signs and selected dynamic signs

------------------------------------------------------------------------

## 1. Executive Summary

The project will deliver a responsive web application that helps deaf
and hard-of-hearing people communicate with people who do not know
Indian Sign Language (ISL).

The application will support two complementary communication channels:

-   **ISL-to-text:** Recognize a predefined set of static and selected
    dynamic ISL signs using the device camera, MediaPipe hand landmarks,
    and a custom gesture-classification model.
-   **Speech-to-text:** Capture spoken English or Hindi and display live
    captions in a readable conversation interface.

The hackathon version will focus on approximately 40 validated signs,
with a configurable target range of 30--50. It will prioritize a
reliable demonstration of a limited vocabulary rather than attempting
full, unrestricted sign-language translation.

### Project Goals

1.  Demonstrate real-time hand tracking and recognition of selected ISL
    signs.
2.  Provide English and Hindi speech-captioning options.
3.  Combine both communication channels in one accessible interface.
4.  Keep the application easy to use without requiring account creation.
5.  Minimize collection and storage of audio, video, and conversation
    data.
6.  Deliver source code, a test report, setup instructions, and a
    working demo.

## 2. Scope Boundaries

  -----------------------------------------------------------------------
  Included in MVP                     Excluded from MVP
  ----------------------------------- -----------------------------------
  30--50 validated ISL signs          Full ISL sentence translation

  Static signs and selected dynamic   Comprehensive facial-expression and
  signs                               body-language recognition

  Camera-based hand landmark          Recognition of every regional sign
  detection                           variant

  English and Hindi speech captions   Guaranteed speech recognition in
                                      every browser

  Conversation transcript during a    Persistent cloud conversation
  session                             history

  Confidence-based recognition and    Guaranteed interpretation accuracy
  rejection                           

  Responsive desktop web interface    Native Android/iOS applications

  Basic privacy and accessibility     Medical or emergency-grade
  controls                            communication guarantees
  -----------------------------------------------------------------------

**Definition of success:** A user can perform supported signs and see
the recognized text, while another person can speak in English or Hindi
and have their speech displayed as captions on the same screen.

## 3. Users and Primary Workflows

The MVP will have one user role: a visitor using the communication tool.
Registration and an administration portal are not required.

### 3.1 ISL-to-Text Workflow

1.  Open the application and select **Sign to Text**.
2.  Grant camera permission and position the hand(s) inside the guide
    area.
3.  MediaPipe detects hand landmarks and tracks them across video
    frames.
4.  The classifier evaluates the current pose or landmark sequence
    against the supported ISL vocabulary.
5.  The application displays a candidate word and confidence indicator.
6.  The user confirms the word, which is added to the message composer.
7.  The user can edit the message, delete the last word, or clear the
    message.

### 3.2 Live Speech Captioning Workflow

1.  Select English or Hindi captions.
2.  Enable microphone access and start listening.
3.  The speech engine produces provisional and finalized text, where
    supported.
4.  Display captions using large text, with a clear distinction between
    provisional and finalized words.
5.  Continue the transcript until the user stops captioning or clears
    the session.

### 3.3 Combined Conversation Workflow

The user activates sign recognition while the other person speaks.
Recognized signs and speech captions appear as separate, clearly labeled
entries in a shared conversation area.

The two recognition processes should run independently so that a
speech-recognition error does not interrupt sign recognition, and vice
versa.

## 4. Functional Requirements

### 4.1 Camera and Sign Recognition

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  ISL-01                  Request and handle      Must
                          camera permissions      

  ISL-02                  Display live camera     Must
                          preview with framing    
                          guidance                

  ISL-03                  Detect one or two hands Must
                          as required by selected 
                          signs                   

  ISL-04                  Extract and normalize   Must
                          hand landmarks          

  ISL-05                  Classify at least 30    Must
                          validated ISL signs     

  ISL-06                  Support selected        Must
                          movement-based signs    
                          using landmark          
                          sequences               

  ISL-07                  Apply confidence        Must
                          thresholds and temporal 
                          smoothing               

  ISL-08                  Display an              Must
                          unknown/uncertain state 
                          when recognition is     
                          unreliable              

  ISL-09                  Allow users to confirm, Must
                          reject, edit, and clear 
                          recognized text         

  ISL-10                  Display a reference for Should
                          each supported sign     

  ISL-11                  Support expansion to 50 Should
                          signs without           
                          redesigning the         
                          application             
  -----------------------------------------------------------------------

### 4.2 Speech Captioning

  -----------------------------------------------------------------------
  ID                      Requirement             Priority
  ----------------------- ----------------------- -----------------------
  CAP-01                  Allow English and Hindi Must
                          language selection      

  CAP-02                  Request microphone      Must
                          permission              

  CAP-03                  Display captions while  Must
                          speech is being         
                          recognized              

  CAP-04                  Distinguish provisional Must
                          and finalized text      

  CAP-05                  Allow captioning to     Must
                          start and stop          
                          independently           

  CAP-06                  Maintain a session      Must
                          transcript              

  CAP-07                  Display a clear error   Must
                          when speech recognition 
                          is unsupported or       
                          unavailable             

  CAP-08                  Allow users to adjust   Should
                          caption text size       

  CAP-09                  Provide a manual        Should
                          language-switch control 

  CAP-10                  Preserve the selected   Should
                          language until the user 
                          changes it              
  -----------------------------------------------------------------------

The first version should use a manually selected speech language rather
than automatic language identification. This reduces ambiguity and makes
the demo easier to validate.

### 4.3 Accessibility and Usability

-   Large text and high contrast.
-   Clear start/stop controls.
-   Visible camera and microphone status.
-   Keyboard-accessible controls and focus indicators.
-   No dependence on color alone for errors or recognition states.
-   A clear way to correct incorrectly recognized signs.
-   Mobile-responsive layout, although desktop is the primary hackathon
    target.
-   A visible notice that this is an experimental assistive tool, not a
    substitute for a qualified interpreter.

## 5. ISL Vocabulary Validation

The vocabulary must be finalized before collecting training data. A sign
should not be selected only because it is easy to classify.

The official Indian Sign Language Research and Training Centre (ISLRTC)
dictionary should be the primary reference. It provides videos with
English/Hindi equivalents, and some entries have multiple signs or
meanings that depend on context. The dictionary also includes regional
variants.

Reference resources:

-   [Official ISL Dictionary](https://divyangjan.depwd.gov.in/islrtc/)
-   [ISLRTC website](https://islrtc.nic.in/)

### 5.1 Vocabulary Selection Process

1.  Prepare a list of approximately 50 candidate concepts.
2.  Check the corresponding ISL dictionary entry and video.
3.  Record the intended meaning, hand configuration, movement, and
    whether one or two hands are needed.
4.  Ask an ISL-fluent reviewer to confirm the selected sign and intended
    meaning.
5.  Prefer signs that can be distinguished using hand landmarks and
    short temporal sequences.
6.  Exclude or defer signs that depend heavily on facial expressions,
    body posture, context, or complex two-hand coordination.
7.  Approve a baseline set of 30 signs, then expand toward 40--50 only
    after testing.

The following list is a **candidate vocabulary for validation**, not a
claim that every English word maps to a single universal ISL sign.

  Category               Candidate concepts
  ---------------------- ---------------------------------------------------
  Greetings              Hello, Good morning, Good night, Welcome, Goodbye
  Courtesy               Please, Thank you, Sorry, Yes, No
  Needs                  Help, Water, Food, Toilet, Rest
  People                 I/me, You, Friend, Family, Teacher
  Actions                Come, Go, Wait, Stop, Finish
  Health and feelings    Happy, Sad, Tired, Sick, Pain
  Communication          Understand, Don't understand, Repeat, What, Where
  Daily life             Home, School, Work, Phone, Money
  **Total candidates**   **40**

### 5.2 Vocabulary Manifest

Maintain a configuration file such as `isl-vocabulary.json` containing
the approved vocabulary. Each entry should include:

-   Unique sign ID.
-   English display label.
-   Hindi display label.
-   ISL reference video or source.
-   Reviewer approval status.
-   Static or dynamic classification.
-   Required number of hands.
-   Model class ID.
-   Training dataset version.
-   Known ambiguities and usage notes.

This allows the team to change the vocabulary without modifying the main
user interface.

## 6. Dataset Collection and Model Development

MediaPipe Hand Landmarker extracts hand keypoints, while the Gesture
Recognizer can classify gestures using a model. Custom gesture
categories can be supported through a custom model or a separate
classifier. Dynamic signs require information about how landmarks change
over time.

### 6.1 Dataset Sources

Use three sources of material:

1.  **Official reference videos:** Use the ISLRTC dictionary to select
    and verify signs. Check its terms and permissions before
    downloading, extracting, redistributing, or using its videos for
    model training.
2.  **Consented recordings:** Record approved signs from ISL-fluent
    participants, ideally including Deaf signers, with consent for the
    intended model-training use.
3.  **Landmark datasets:** Extract normalized landmark coordinates from
    authorized recordings to create training examples.

Do not treat dictionary reference videos alone as a sufficient training
dataset. They may contain only a few examples, fixed camera angles, or
limited signer variation.

### 6.2 Suggested Initial Dataset Size

These are planning targets, not guarantees of model accuracy.

  Dataset component                                     Initial target
  ----------------------------------- --------------------------------
  Approved sign classes                                         30--40
  Training clips per sign                                      50--100
  Validation clips per sign                                     10--20
  Test clips per sign                                           20--30
  Separate unknown/no-sign examples                 At least 200 clips
  Distinct signers                      Aim for 5 or more, if feasible

At 40 classes, this could mean 3,200--6,000 positive clips across
training, validation, and testing. If the team cannot collect that many
clips in time, start with 30 signs and a smaller but carefully designed
dataset.

**Critical rule:** Split training, validation, and test data by signer,
not merely by video clip. If frames from the same recording appear in
both training and testing, the measured accuracy can be misleading.

### 6.3 Recording Protocol

-   Record the signer, sign ID, recording session, and consent status.
-   Use a consistent neutral starting pose and a clear ending where
    appropriate.
-   Record different repetitions rather than extracting many nearly
    identical clips.
-   Include variation in lighting, distance, background, hand size, and
    signing speed.
-   Capture both left- and right-handed signing where relevant.
-   Capture one- or two-hand configurations according to the sign
    specification.
-   Record a neutral/no-sign sequence between repetitions to help the
    system learn when not to predict a word.
-   Keep raw video access restricted and delete recordings when no
    longer needed under the agreed retention policy.

The vocabulary should be reviewed by an ISL-fluent person before
recordings begin.

### 6.4 Static Versus Dynamic Classification

**Static signs**

A single pose or a short stable sequence is classified using normalized
landmark coordinates, joint angles, handedness, and optional relative
distances.

Candidate model: feature-based classifier or compact neural network.

**Dynamic signs**

A sequence of landmark vectors is collected over a short time window and
classified using movement direction, speed, trajectory, and pose
changes.

Candidate model: temporal neural network, 1D CNN, or another sequence
classifier.

For the hackathon, keep dynamic signs to a small, reviewed subset. Avoid
signs whose meaning depends primarily on facial expressions or body
posture unless the team adds those inputs.

### 6.5 Model Training and Inference Pipeline

1.  Collect authorized, labeled ISL recordings.
2.  Extract landmarks and normalize them.
3.  Create signer-separated training, validation, and test datasets.
4.  Train the static and dynamic classifiers.
5.  Evaluate per-class performance and false detections.
6.  Calibrate confidence thresholds on validation data.
7.  Export and version the classifier and vocabulary manifest.
8.  Run inference in the browser and convert accepted predictions into
    text.

### 6.6 Recognition Controls

The runtime recognition logic should include:

-   A minimum confidence threshold, calibrated on validation data.
-   Temporal smoothing to avoid changing the predicted word every frame.
-   A stable-prediction window before displaying a candidate.
-   A neutral/no-sign class and a rejection state.
-   A short cooldown or explicit confirmation before adding the same
    sign repeatedly.
-   A configurable reset between signs.
-   A separate motion-sequence classifier for supported dynamic signs.

Do not expose a confidence percentage as if it were a guarantee of
correctness. The UI can show a qualitative state such as "Likely
recognized" or "Please repeat the sign."

## 7. Speech Recognition Architecture

The application will offer two caption modes:

-   English: `en-IN`
-   Hindi: `hi-IN`

These are locale preferences for the selected speech engine; actual
availability and language quality must be verified on the target browser
and device.

### 7.1 Recommended Approach

For the fastest prototype, test the browser's Web Speech API first. Its
`SpeechRecognition` interface can provide interim results, but browser
availability is limited and some implementations rely on remote speech
recognition.

If the selected browser cannot provide reliable English and Hindi
recognition, use a compatible speech-to-text service as a fallback.
Choose a service that supports both required languages and meets the
project's privacy requirements.

### 7.2 Caption Behavior

-   Keep finalized text visible even when new interim text arrives.
-   Replace the current interim segment rather than appending each
    partial hypothesis as a new sentence.
-   Avoid duplicating words when the speech engine restarts.
-   Display microphone status and the selected language.
-   Stop listening and release the microphone when the user stops
    captioning.
-   Show a clear error if the browser does not support speech
    recognition.
-   Do not claim offline operation unless the selected engine has been
    verified to work offline.

## 8. Application Architecture

### 8.1 Recommended Technology Stack

  -----------------------------------------------------------------------
  Component                           Recommended choice
  ----------------------------------- -----------------------------------
  UI                                  React, TypeScript, responsive CSS

  Camera                              Browser MediaDevices API

  Hand tracking                       `@mediapipe/tasks-vision`

  Static sign classifier              Custom lightweight classifier

  Dynamic sign classifier             Temporal model using landmark
                                      sequences

  Browser inference                   JavaScript/TypeScript;
                                      TensorFlow.js or another suitable
                                      runtime if needed

  Speech recognition                  Web Speech API with tested fallback
                                      service

  Session transcript                  In-memory application state

  Backend                             Optional, only for necessary cloud
                                      speech services or later features

  Deployment                          HTTPS web hosting
  -----------------------------------------------------------------------

MediaPipe provides a JavaScript implementation for browser-based hand
landmark detection. Video processing can block the UI thread, so use a
Web Worker where appropriate or otherwise keep the inference workload
controlled.

### 8.2 Architecture Flow

``` mermaid
flowchart TD
    A["Web Application"] --> B["Camera Capture"]
    A --> C["Microphone Capture"]
    B --> D["MediaPipe Hand Landmarker"]
    D --> E["Landmark Normalization"]
    E --> F["Static Classifier"]
    E --> G["Dynamic Sequence Classifier"]
    F --> H["Confidence and Temporal Filtering"]
    G --> H
    H --> I["Sign Text Composer"]
    C --> J["Speech Recognition Engine"]
    J --> K["Interim and Final Caption Handling"]
    I --> L["Combined Conversation UI"]
    K --> L
    L --> M["Session Transcript"]
```

The camera pipeline should run locally in the browser where feasible.
The speech pipeline may be local or remote depending on the chosen
engine. The interface must disclose remote audio processing if used.

## 9. Screen-Level Requirements

  -----------------------------------------------------------------------
  Screen                              Requirements
  ----------------------------------- -----------------------------------
  Welcome                             Explain the tool, offer
                                      Sign-to-Text and Live Captions,
                                      link to privacy information

  Sign-to-Text                        Camera preview, landmark overlay,
                                      recognition status, candidate text,
                                      confirmation and correction

  Live Captions                       English/Hindi selector, microphone
                                      controls, interim text, finalized
                                      transcript

  Combined Conversation               Separate sign and speech messages,
                                      clear chronology, large text

  ISL Sign Reference                  Search/list of supported signs,
                                      validated reference media,
                                      English/Hindi labels

  Settings                            Text size, camera/microphone
                                      status, caption language, privacy
                                      and troubleshooting

  Error states                        Permission denied, no hand
                                      detected, unsupported sign, low
                                      confidence, microphone unavailable,
                                      network failure
  -----------------------------------------------------------------------

The interface should be usable on a standard laptop without requiring a
technical operator to explain each control.

## 10. Non-Functional Requirements

### 10.1 Performance Targets

These are proposed targets to verify on the selected demo hardware, not
guarantees.

  -----------------------------------------------------------------------
  Metric                              Initial target
  ----------------------------------- -----------------------------------
  Hand tracking                       Aim for 15--30 processed frames per
                                      second where hardware permits

  Static sign feedback                Target within 500 ms after a stable
                                      pose is available

  Dynamic sign feedback               Target within 1 second after the
                                      sign sequence completes

  Caption display                     Show partial results as soon as the
                                      engine supplies them

  UI responsiveness                   Avoid long blocking inference tasks

  Application availability            Handle unsupported devices
                                      gracefully rather than crashing
  -----------------------------------------------------------------------

Speech-caption latency depends on the speech engine, network, language,
and device. Measure it separately from camera inference.

### 10.2 Privacy and Security

-   Obtain camera and microphone permission explicitly.
-   Process hand landmarks locally where feasible.
-   Do not store or upload raw camera footage by default.
-   Do not save transcripts after the session unless the user explicitly
    chooses to export them.
-   Disclose any third-party audio processing.
-   Use HTTPS for deployment.
-   Obtain informed consent for signer recordings and define
    retention/deletion rules.
-   Verify reuse rights for reference videos and training material.
-   Do not use this prototype as the sole communication channel in
    medical, legal, emergency, or other high-stakes situations.

## 11. Development Milestones and Timeline

Recommended schedule: **10 working days** for a small team of 3--4
people. A shorter hackathon can deliver a reduced 30-sign baseline, but
data collection and model validation should not be skipped.

### Days 1--2: Requirements and UI

-   Finalize the initial 30-sign vocabulary with ISL review.
-   Define the static/dynamic sign split.
-   Build the responsive interface and camera/microphone permission
    handling.
-   Test English and Hindi speech recognition in the target browser.

**Deliverable:** Clickable UI and validated technical approach.

### Days 3--4: Dataset and Hand Tracking

-   Integrate MediaPipe.
-   Define the landmark feature format.
-   Record initial training examples with consent.
-   Implement dataset labels and train/validation/test separation.

**Deliverable:** Working hand tracking and labeled sample dataset.

### Days 5--6: Classifier

-   Train the static sign classifier.
-   Implement selected dynamic sign sequences.
-   Add confidence thresholds, temporal smoothing, and unknown-sign
    handling.
-   Evaluate errors and refine the vocabulary.

**Deliverable:** Initial working recognition model.

### Days 7--8: Communication Interface

-   Complete English/Hindi captioning.
-   Connect the sign composer and speech transcript.
-   Add text corrections, reference vocabulary, and error states.
-   Test camera and speech processes running simultaneously.

**Deliverable:** End-to-end application.

### Days 9--10: Testing and Demo

-   Run signer-independent testing.
-   Measure per-sign accuracy and false detections.
-   Test speech captions, permissions, and recovery behavior.
-   Deploy over HTTPS and prepare a scripted demonstration.

**Deliverable:** Demonstrable MVP, test report, and setup guide.

### 11.1 Suggested Team Responsibilities

  -----------------------------------------------------------------------
  Role                                Responsibilities
  ----------------------------------- -----------------------------------
  Frontend developer                  React UI, camera integration,
                                      speech captions, transcript

  ML/computer vision developer        MediaPipe, landmark features,
                                      classifiers, model evaluation

  Data and ISL validation lead        Vocabulary selection, signer
                                      coordination, data labeling,
                                      consent

  Integration and QA developer        Integration, browser testing,
                                      performance, deployment, demo
  -----------------------------------------------------------------------

For a three-person team, combine integration/QA with frontend and share
data collection with the ML developer.

## 12. Testing Strategy

### 12.1 Sign Recognition Tests

  -----------------------------------------------------------------------
  Test                    Procedure               Expected result
  ----------------------- ----------------------- -----------------------
  Correct static sign     Perform a supported     Correct candidate
                          static sign             appears after
                                                  stabilization

  Correct dynamic sign    Perform a supported     Correct candidate
                          movement-based sign     appears after the
                                                  sequence

  Unknown sign            Perform a sign outside  Unknown/unsupported
                          the vocabulary          state; no incorrect
                                                  word auto-added

  No hand detected        Move hands out of frame Guidance appears and no
                                                  new sign is accepted

  Similar signs           Test visually similar   Confusion is measured
                          signs separately        and errors are logged

  Different signer        Test a person excluded  Performance is measured
                          from training           independently

  Lighting variation      Repeat in bright, dim,  Failure conditions are
                          and uneven lighting     documented

  Camera position         Vary distance and hand  Recognition remains
                          position                usable within the
                                                  documented range

  Two-hand sign           Perform a selected      Both hands are handled
                          two-hand sign           correctly

  Repeated sign           Hold a sign or repeat   The word is not
                          it several times        unintentionally added
                                                  every frame
  -----------------------------------------------------------------------

### 12.2 Speech Caption Tests

-   English speech with normal pacing.
-   Hindi speech with normal pacing.
-   Short and long sentences.
-   Background noise and multiple speakers.
-   Pauses and speech-recognition restarts.
-   Microphone permission denied.
-   Browser speech recognition unavailable.
-   Network loss if the selected engine uses remote processing.
-   Correct handling of interim versus finalized text.
-   Switching languages between sessions.

### 12.3 Integration Tests

-   Sign recognition and captions operate simultaneously.
-   Camera failure does not stop captions.
-   Speech failure does not stop sign recognition.
-   Finalized speech text is not duplicated after an engine restart.
-   Sign text can be corrected before it is added to the conversation.
-   Transcript clearing works as expected.
-   Camera and microphone are released when stopped.
-   Refreshing or closing the application does not silently persist
    session data.

## 13. Acceptance Criteria and Measurable Targets

The following are proposed project targets. They must be measured
against the agreed test protocol; they are not pre-established
performance claims.

  -----------------------------------------------------------------------
  Acceptance criterion                Target
  ----------------------------------- -----------------------------------
  Vocabulary                          At least 30 ISL signs approved and
                                      implemented

  Static recognition                  At least 85% top-1 accuracy on the
                                      held-out test set

  Dynamic recognition                 At least 80% top-1 accuracy on the
                                      held-out test set

  False acceptance                    Measure unsupported-sign false
                                      positives and document the result

  Static feedback latency             Target ≤ 500 ms after stable-pose
                                      detection

  Dynamic feedback latency            Target ≤ 1 second after the
                                      completed sign sequence

  English captions                    Successfully demonstrate
                                      speech-to-text in the agreed
                                      browser

  Hindi captions                      Successfully demonstrate
                                      speech-to-text in the agreed
                                      browser

  Combined operation                  Both communication channels operate
                                      in the same session

  Usability                           Users can start, stop, and correct
                                      output without technical assistance

  Privacy                             No raw audio/video or transcript
                                      persistence by default

  Deployment                          Accessible via HTTPS on the
                                      designated demo device
  -----------------------------------------------------------------------

### Accuracy Measurement Rules

-   Report static and dynamic sign results separately.
-   Calculate accuracy on a held-out set from signers not used for
    training.
-   Report per-class accuracy, macro-average accuracy, and a confusion
    matrix.
-   Measure false acceptance on unknown/no-sign clips.
-   Measure latency from the defined recognition event to the visible
    output.
-   Report speech quality separately using word error rate (WER), with
    English and Hindi evaluated independently.

If the accuracy target is not reached, reduce the vocabulary or remove
poorly performing signs rather than presenting an unvalidated model as
reliable.

## 14. Risks and Mitigation

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Not enough training data            Prioritize 30 signs and gather
                                      diverse examples early

  Similar signs are confused          Review confusion matrix and replace
                                      difficult candidates

  Dynamic signs require more context  Restrict the initial dynamic subset
                                      and use temporal features

  Speech recognition differs by       Test the target browser on Day 1
  browser                             and prepare a fallback engine

  External speech processing raises   Disclose remote processing and use
  privacy concerns                    a suitable service configuration

  Limited ISL expertise               Involve an ISL-fluent reviewer and
                                      obtain vocabulary approval

  Data licensing restrictions         Verify rights before reusing
                                      dictionary videos or other datasets

  Timeline overrun                    Prioritize the core recognition and
                                      caption workflows over secondary
                                      screens
  -----------------------------------------------------------------------

## 15. Final Deliverables

1.  Responsive React web application source code.
2.  MediaPipe camera and hand landmark integration.
3.  Custom static/dynamic ISL classifier and model files.
4.  Versioned, reviewed vocabulary manifest.
5.  Dataset preparation and model-training scripts, where applicable.
6.  Speech-captioning integration for English and Hindi.
7.  Combined conversation interface.
8.  Recognition test report, confusion matrix, and latency measurements.
9.  Deployment instructions and a working HTTPS demo.
10. README containing setup, browser requirements, model limitations,
    data provenance, and privacy notes.

## 16. Definition of Done

The hackathon MVP is complete when a participant can open the web
application, enable the camera, perform a supported ISL sign, see the
corresponding text, and have a spoken English or Hindi sentence
displayed as a caption in the same conversation session.

The team must also demonstrate at least one unsupported-sign case,
explain the recognition limitations, and show measured results from a
held-out test set.

**Final recommendation:** Validate a smaller vocabulary and build a
dependable recognition pipeline before expanding toward 50 signs. This
will produce a more credible and useful accessibility prototype than a
larger vocabulary with untested accuracy.
