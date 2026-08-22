"use client";

import * as React from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  PaperclipIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/design-system/components/attachment";
import { Avatar, AvatarFallback } from "@/design-system/components/avatar";
import { Badge } from "@/design-system/components/badge";
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@/design-system/components/bubble";
import { Button } from "@/design-system/components/button";
import { Field, FieldDescription, FieldLabel } from "@/design-system/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/design-system/components/input-group";
import { Marker, MarkerContent, MarkerIcon } from "@/design-system/components/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@/design-system/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/design-system/components/message-scroller";
import { Progress } from "@/design-system/components/progress";
import { RadioGroup, RadioGroupItem } from "@/design-system/components/radio-group";
import { Spinner } from "@/design-system/components/spinner";

/* The page chrome is shared with the general system so the two read as one
   documentation surface rather than two. */
import { Group, Section, Spec, SpecGrid, generalStyles as shell } from "../general/shell";
import styles from "./chat.module.css";

type Turn = { id: number; from: "user" | "agent"; text: string };

const SEED: Turn[] = [
  { id: 1, from: "user", text: "Summarise the latest project notes and call out anything blocked." },
  { id: 2, from: "agent", text: "Three updates: the research sprint is on track, the mobile refresh is ready for review, and the launch plan is still waiting on an owner." },
  { id: 3, from: "user", text: "What should we tackle first?" },
  { id: 4, from: "agent", text: "Start with the launch plan — it is the only item blocked on a person rather than on work." },
];

/** The transcript at the top: every primitive on this page, working together. */
function LiveTranscript() {
  const [turns, setTurns] = React.useState(SEED);
  const [draft, setDraft] = React.useState("");

  function send() {
    const text = draft.trim();
    if (!text) return;
    setTurns((current) => [
      ...current,
      { id: current.length + 1, from: "user", text },
      {
        id: current.length + 2,
        from: "agent",
        text: "Noted. I will fold that into the next summary and flag anything that blocks it.",
      },
    ]);
    setDraft("");
  }

  return (
    <div className={styles.transcript}>
      <MessageScrollerProvider>
        <MessageScroller className={styles.scroller}>
          <MessageScrollerViewport className={styles.viewport}>
            <MessageScrollerContent className={styles.thread}>
              <MessageScrollerItem>
                <Marker variant="separator">
                  <MarkerContent>Today</MarkerContent>
                </Marker>
              </MessageScrollerItem>

              {turns.map((turn, index) => (
                <MessageScrollerItem key={turn.id}>
                  <Message align={turn.from === "user" ? "end" : "start"}>
                    {turn.from === "agent" ? (
                      <MessageAvatar>
                        <Avatar>
                          <AvatarFallback>
                            <SparklesIcon className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                    ) : null}
                    <MessageContent>
                      {turn.from === "agent" ? <MessageHeader>Minder AI</MessageHeader> : null}
                      <Bubble
                        align={turn.from === "user" ? "end" : "start"}
                        variant={turn.from === "user" ? "default" : "muted"}
                      >
                        <BubbleContent>{turn.text}</BubbleContent>
                      </Bubble>
                      {turn.from === "agent" && index === 1 ? (
                        <MessageFooter>Answered in 1.2s · 4 sources</MessageFooter>
                      ) : null}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}

              <MessageScrollerItem>
                <Marker>
                  <MarkerIcon>
                    <CheckIcon />
                  </MarkerIcon>
                  <MarkerContent>Read 4 files · completed</MarkerContent>
                </Marker>
              </MessageScrollerItem>
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <InputGroup className={styles.composer}>
        <InputGroupTextarea
          placeholder="Ask the agent to continue…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton variant="ghost" size="icon-xs" aria-label="Attach a file">
            <PaperclipIcon />
          </InputGroupButton>
          <InputGroupButton
            variant="default"
            size="icon-xs"
            className="ml-auto"
            aria-label="Send"
            disabled={!draft.trim()}
            onClick={send}
          >
            <ArrowUpIcon />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

/** Composed from Field, RadioGroup, and Progress — there is no vendored primitive. */
function Questionnaire() {
  const QUESTIONS = [
    {
      title: "What should the agent optimise for?",
      description: "This shapes how it ranks the next actions.",
      choices: ["Speed to first reply", "Depth of research", "Lowest token cost"],
    },
    {
      title: "How much autonomy should it have?",
      description: "You can change this per workspace later.",
      choices: ["Ask before every write", "Ask once per session", "Run unattended"],
    },
  ];

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<string[]>([]);
  const done = step >= QUESTIONS.length;
  const question = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];

  return (
    <div className={styles.questionnaire}>
      <div className={styles.questionnaireTop}>
        <span>
          {done ? "Complete" : `Question ${step + 1} of ${QUESTIONS.length}`}
        </span>
        <span>{Math.round(((done ? QUESTIONS.length : step) / QUESTIONS.length) * 100)}%</span>
      </div>
      <Progress value={((done ? QUESTIONS.length : step) / QUESTIONS.length) * 100} />

      {done ? (
        <div className={styles.questionnaireDone}>
          <Marker>
            <MarkerIcon>
              <CheckIcon />
            </MarkerIcon>
            <MarkerContent>Preferences saved</MarkerContent>
          </Marker>
          <div className={styles.chips}>
            {answers.map((answer) => (
              <Badge key={answer} variant="secondary">
                {answer}
              </Badge>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStep(0);
              setAnswers([]);
            }}
          >
            Start over
          </Button>
        </div>
      ) : (
        <Field>
          <FieldLabel htmlFor={`q-${step}`}>{question.title}</FieldLabel>
          <FieldDescription>{question.description}</FieldDescription>
          <RadioGroup
            id={`q-${step}`}
            value={answers[step] ?? ""}
            onValueChange={(value) =>
              setAnswers((current) => {
                const next = [...current];
                next[step] = value;
                return next;
              })
            }
            className={styles.choices}
          >
            {question.choices.map((choice) => (
              <label className={styles.choice} key={choice} data-selected={answers[step] === choice || undefined}>
                <RadioGroupItem value={choice} />
                <span>{choice}</span>
              </label>
            ))}
          </RadioGroup>
          <div className={styles.questionnaireActions}>
            <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            <Button size="sm" disabled={!answers[step]} onClick={() => setStep((s) => s + 1)}>
              {step === QUESTIONS.length - 1 ? "Finish" : "Next"}
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}

export default function ChatDesignSystem() {
  return (
    <div className={styles.page}>
      <header className={shell.hero}>
        <p className={shell.heroEyebrow}>MINDER · AI CHAT DESIGN SYSTEM</p>
        <h1>
          Conversation primitives
          <br />
          for thoughtful agents.
        </h1>
        <p className={shell.heroLead}>
          Transcripts, bubbles, step markers, attachments, and the composer — every one the live
          component from <code>design-system/components</code>. The transcript below is interactive:
          send a message and it sticks to the newest turn.
        </p>
      </header>

      <Section
        id="transcript"
        index="01"
        title="The transcript"
        copy="Message, Bubble, Marker, and Message Scroller working together, with the composer wired up."
      >
        <LiveTranscript />
      </Section>

      <Section
        id="anatomy"
        index="02"
        title="Anatomy"
        copy="The same primitives on their own, so each one's variants are visible."
      >
        <Group title="Message" hint="components/message">
          <MessageGroup className={styles.anatomyBlock}>
            <Message align="end">
              <MessageContent>
                <Bubble align="end">
                  <BubbleContent>A user turn, aligned to the end.</BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
            <Message>
              <MessageAvatar>
                <Avatar>
                  <AvatarFallback>
                    <SparklesIcon className="size-4" />
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
              <MessageContent>
                <MessageHeader>Minder AI</MessageHeader>
                <Bubble variant="muted">
                  <BubbleContent>
                    An agent turn: avatar, header, bubble, and a footer for provenance.
                  </BubbleContent>
                </Bubble>
                <MessageFooter>Answered in 1.2s · 4 sources</MessageFooter>
              </MessageContent>
            </Message>
          </MessageGroup>
        </Group>

        <SpecGrid columns={2}>
          <Spec label="Bubble" source="components/bubble">
            <BubbleGroup className={styles.fill}>
              <Bubble align="end">
                <BubbleContent>Default</BubbleContent>
              </Bubble>
              <Bubble variant="secondary">
                <BubbleContent>Secondary</BubbleContent>
              </Bubble>
              <Bubble variant="muted">
                <BubbleContent>Muted</BubbleContent>
              </Bubble>
              <Bubble variant="tinted">
                <BubbleContent>Tinted</BubbleContent>
              </Bubble>
              <Bubble variant="outline">
                <BubbleContent>Outline</BubbleContent>
              </Bubble>
              <Bubble variant="destructive">
                <BubbleContent>Destructive — a refused or failed turn</BubbleContent>
              </Bubble>
              <Bubble variant="muted" className="mb-4">
                <BubbleContent>With reactions</BubbleContent>
                <BubbleReactions>
                  <span>🎉</span>
                  <span>3</span>
                </BubbleReactions>
              </Bubble>
            </BubbleGroup>
          </Spec>

          <Spec label="Marker" source="components/marker">
            <div className={styles.markerStack}>
              <Marker>
                <MarkerIcon>
                  <Spinner />
                </MarkerIcon>
                <MarkerContent>Reading 4 files…</MarkerContent>
              </Marker>
              <Marker>
                <MarkerIcon>
                  <CheckIcon />
                </MarkerIcon>
                <MarkerContent>Deployment plan drafted</MarkerContent>
              </Marker>
              <Marker variant="separator">
                <MarkerContent>Today</MarkerContent>
              </Marker>
              <Marker variant="border">
                <MarkerContent>Context updated</MarkerContent>
              </Marker>
            </div>
          </Spec>

          <Spec label="Attachment" source="components/attachment">
            <AttachmentGroup className={styles.fill}>
              <Attachment>
                <AttachmentMedia variant="icon">
                  <FileTextIcon />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>roadmap.pdf</AttachmentTitle>
                  <AttachmentDescription>248 KB</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction aria-label="Remove">
                    <XIcon />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
              <Attachment>
                <AttachmentMedia variant="icon">
                  <ImageIcon />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>dashboard.png</AttachmentTitle>
                  <AttachmentDescription>1.1 MB</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction aria-label="Remove">
                    <XIcon />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            </AttachmentGroup>
          </Spec>

          <Spec label="Composer" source="components/input-group">
            <InputGroup className={styles.composer}>
              <InputGroupTextarea placeholder="Ask the agent to continue…" />
              <InputGroupAddon align="block-end">
                <InputGroupButton variant="ghost" size="icon-xs" aria-label="Attach a file">
                  <PaperclipIcon />
                </InputGroupButton>
                <InputGroupButton variant="default" size="icon-xs" className="ml-auto" aria-label="Send">
                  <ArrowUpIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Spec>
        </SpecGrid>
      </Section>

      <Section
        id="questionnaire"
        index="03"
        title="Questionnaire"
        copy="When the agent needs a decision it cannot infer. Composed from Field, RadioGroup, Progress, and Marker — there is no vendored questionnaire primitive."
      >
        <SpecGrid columns={2}>
          <Spec label="Questionnaire" source="composed · field + radio-group + progress">
            <Questionnaire />
          </Spec>
        </SpecGrid>
      </Section>
    </div>
  );
}
