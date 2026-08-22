"use client";

import * as React from "react";
import { CheckIcon, FileTextIcon, ImageIcon, SparklesIcon, XIcon } from "lucide-react";

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
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@/design-system/components/bubble";
import { Button } from "@/design-system/components/button";
import { Marker, MarkerContent, MarkerIcon } from "@/design-system/components/marker";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@/design-system/components/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/design-system/components/message-scroller";
import { Spinner } from "@/design-system/components/spinner";

import type { ComponentDoc } from "./types";

export const chatDocs: ComponentDoc[] = [
  {
    name: "message",
    title: "Message",
    description: "A conversation row with an avatar, header, content, and footer.",
    category: "AI chat",
    usage: `import { Message, MessageAvatar, MessageContent } from "@/design-system/components/message"

<Message><MessageAvatar>…</MessageAvatar><MessageContent>…</MessageContent></Message>`,
    demos: [
      {
        id: "default",
        title: "Conversation",
        code: `<MessageGroup className="w-full max-w-lg">
  <Message align="end">
    <MessageContent>
      <Bubble align="end"><BubbleContent>Summarize the latest notes.</BubbleContent></Bubble>
    </MessageContent>
  </Message>
  <Message>
    <MessageAvatar><Avatar><AvatarFallback>AI</AvatarFallback></Avatar></MessageAvatar>
    <MessageContent>
      <MessageHeader>Minder Agent</MessageHeader>
      <Bubble variant="muted"><BubbleContent>Three updates…</BubbleContent></Bubble>
      <MessageFooter>Answered in 1.2s</MessageFooter>
    </MessageContent>
  </Message>
</MessageGroup>`,
        Component: () => (
          <MessageGroup className="w-full max-w-lg">
            <Message align="end">
              <MessageContent>
                <Bubble align="end">
                  <BubbleContent>
                    Summarize the latest project notes and call out anything blocked.
                  </BubbleContent>
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
                <MessageHeader>Minder Agent</MessageHeader>
                <Bubble variant="muted">
                  <BubbleContent>
                    Three updates: the research sprint is on track, the mobile refresh is ready for
                    review, and the launch plan is still waiting on an owner.
                  </BubbleContent>
                </Bubble>
                <MessageFooter>Answered in 1.2s</MessageFooter>
              </MessageContent>
            </Message>
          </MessageGroup>
        ),
      },
    ],
  },
  {
    name: "bubble",
    title: "Bubble",
    description: "The speech bubble inside a message, with variants and reactions.",
    category: "AI chat",
    usage: `import { Bubble, BubbleContent } from "@/design-system/components/bubble"

<Bubble variant="muted"><BubbleContent>Hello</BubbleContent></Bubble>`,
    demos: [
      {
        id: "variants",
        title: "Variants",
        code: `<BubbleGroup>
  <Bubble><BubbleContent>Default</BubbleContent></Bubble>
  <Bubble variant="secondary"><BubbleContent>Secondary</BubbleContent></Bubble>
  <Bubble variant="muted"><BubbleContent>Muted</BubbleContent></Bubble>
  <Bubble variant="outline"><BubbleContent>Outline</BubbleContent></Bubble>
  <Bubble variant="destructive"><BubbleContent>Destructive</BubbleContent></Bubble>
</BubbleGroup>`,
        Component: () => (
          <BubbleGroup className="w-full max-w-md">
            <Bubble align="end">
              <BubbleContent>Default, aligned to the end</BubbleContent>
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
              <BubbleContent>Destructive</BubbleContent>
            </Bubble>
          </BubbleGroup>
        ),
      },
      {
        id: "reactions",
        title: "With reactions",
        code: `<Bubble variant="muted" className="mb-3">
  <BubbleContent>Shipped the FDE kit sync.</BubbleContent>
  <BubbleReactions>🎉 3</BubbleReactions>
</Bubble>`,
        Component: () => (
          <Bubble variant="muted" className="mb-4">
            <BubbleContent>Shipped the FDE kit sync.</BubbleContent>
            <BubbleReactions>
              <span>🎉</span>
              <span>3</span>
            </BubbleReactions>
          </Bubble>
        ),
      },
    ],
  },
  {
    name: "marker",
    title: "Marker",
    description: "An inline status line for agent steps and transcript dividers.",
    category: "AI chat",
    usage: `import { Marker, MarkerContent, MarkerIcon } from "@/design-system/components/marker"

<Marker><MarkerIcon><CheckIcon /></MarkerIcon><MarkerContent>Done</MarkerContent></Marker>`,
    demos: [
      {
        id: "default",
        title: "Variants",
        code: `<Marker>
  <MarkerIcon><CheckIcon /></MarkerIcon>
  <MarkerContent>Read 4 files</MarkerContent>
</Marker>
<Marker variant="separator"><MarkerContent>Today</MarkerContent></Marker>
<Marker variant="border"><MarkerContent>Context updated</MarkerContent></Marker>`,
        Component: () => (
          <div className="grid w-full max-w-md gap-4">
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
        ),
      },
    ],
  },
  {
    name: "attachment",
    title: "Attachment",
    description: "A file or image chip for composer and transcript surfaces.",
    category: "AI chat",
    usage: `import { Attachment, AttachmentContent, AttachmentTitle } from "@/design-system/components/attachment"

<Attachment><AttachmentContent><AttachmentTitle>notes.pdf</AttachmentTitle></AttachmentContent></Attachment>`,
    demos: [
      {
        id: "default",
        title: "Attachment group",
        code: `<AttachmentGroup>
  <Attachment>
    <AttachmentMedia variant="icon"><FileTextIcon /></AttachmentMedia>
    <AttachmentContent>
      <AttachmentTitle>roadmap.pdf</AttachmentTitle>
      <AttachmentDescription>248 KB</AttachmentDescription>
    </AttachmentContent>
    <AttachmentActions><AttachmentAction><XIcon /></AttachmentAction></AttachmentActions>
  </Attachment>
</AttachmentGroup>`,
        Component: () => (
          <AttachmentGroup className="w-full max-w-md">
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
        ),
      },
    ],
  },
  {
    name: "message-scroller",
    title: "Message Scroller",
    description: "A transcript viewport that sticks to the newest message and offers a jump button.",
    category: "AI chat",
    usage: `import { MessageScroller, MessageScrollerViewport } from "@/design-system/components/message-scroller"

<MessageScrollerProvider>
  <MessageScroller><MessageScrollerViewport>…</MessageScrollerViewport></MessageScroller>
</MessageScrollerProvider>`,
    demos: [
      {
        id: "default",
        title: "Live transcript",
        description: "Scroll up, then add a message — the jump-to-end button appears.",
        code: `<MessageScrollerProvider>
  <MessageScroller className="h-72 rounded-lg border">
    <MessageScrollerViewport className="p-4">
      <MessageScrollerContent>
        {messages.map((message) => (
          <MessageScrollerItem key={message.id}>…</MessageScrollerItem>
        ))}
      </MessageScrollerContent>
    </MessageScrollerViewport>
    <MessageScrollerButton />
  </MessageScroller>
</MessageScrollerProvider>`,
        Component: () => <MessageScrollerDemo />,
      },
    ],
  },
];

const seedMessages = [
  { id: 1, from: "user" as const, text: "Summarize the latest project notes." },
  { id: 2, from: "agent" as const, text: "Three updates: research is on track, the mobile refresh is ready for review, and the launch plan is waiting on an owner." },
  { id: 3, from: "user" as const, text: "What should we tackle first?" },
  { id: 4, from: "agent" as const, text: "Start with the launch plan — it is the only item blocked on a person rather than on work." },
  { id: 5, from: "user" as const, text: "Who is the best owner for it?" },
  { id: 6, from: "agent" as const, text: "Mai already owns the two adjacent workstreams, so the hand-off cost is lowest there." },
];

function MessageScrollerDemo() {
  const [messages, setMessages] = React.useState(seedMessages);

  return (
    <div className="grid w-full max-w-lg gap-3">
      <MessageScrollerProvider>
        <MessageScroller className="h-72 rounded-lg border">
          <MessageScrollerViewport className="p-4">
            <MessageScrollerContent className="gap-4">
              {messages.map((message) => (
                <MessageScrollerItem key={message.id}>
                  <Message align={message.from === "user" ? "end" : "start"}>
                    {message.from === "agent" ? (
                      <MessageAvatar>
                        <Avatar>
                          <AvatarFallback>
                            <SparklesIcon className="size-4" />
                          </AvatarFallback>
                        </Avatar>
                      </MessageAvatar>
                    ) : null}
                    <MessageContent>
                      <Bubble
                        align={message.from === "user" ? "end" : "start"}
                        variant={message.from === "user" ? "default" : "muted"}
                      >
                        <BubbleContent>{message.text}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>
      <Button
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() =>
          setMessages((current) => [
            ...current,
            {
              id: current.length + 1,
              from: current.length % 2 === 0 ? ("user" as const) : ("agent" as const),
              text: `Follow-up message #${current.length + 1}.`,
            },
          ])
        }
      >
        Append a message
      </Button>
    </div>
  );
}
