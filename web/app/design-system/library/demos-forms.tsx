"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowUpRightIcon,
  BoldIcon,
  CheckIcon,
  CopyIcon,
  ItalicIcon,
  MailIcon,
  SearchIcon,
  StarIcon,
  UnderlineIcon,
} from "lucide-react";

import { Button } from "@/design-system/components/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/design-system/components/button-group";
import { Calendar } from "@/design-system/components/calendar";
import { Checkbox } from "@/design-system/components/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/design-system/components/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/design-system/components/field";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/design-system/components/form";
import { Input } from "@/design-system/components/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/design-system/components/input-group";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/design-system/components/input-otp";
import { Label } from "@/design-system/components/label";
import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select";
import { RadioGroup, RadioGroupItem } from "@/design-system/components/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/design-system/components/select";
import { Slider } from "@/design-system/components/slider";
import { Spinner } from "@/design-system/components/spinner";
import { Switch } from "@/design-system/components/switch";
import { Textarea } from "@/design-system/components/textarea";
import { Toggle } from "@/design-system/components/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/design-system/components/toggle-group";

import type { ComponentDoc } from "./types";

export const formDocs: ComponentDoc[] = [
  {
    name: "button",
    title: "Button",
    description: "Displays a button or a component that looks like a button.",
    category: "Forms",
    usage: `import { Button } from "@/design-system/components/button"

<Button variant="outline">Button</Button>`,
    demos: [
      {
        id: "variants",
        title: "Variants",
        description: "Six variants cover every level of emphasis on a surface.",
        code: `<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>`,
        Component: () => (
          <>
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </>
        ),
      },
      {
        id: "size",
        title: "Size",
        description: "Use the size prop to change the size of the button.",
        code: `<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><ArrowUpRightIcon /></Button>`,
        Component: () => (
          <>
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Open">
              <ArrowUpRightIcon />
            </Button>
          </>
        ),
      },
      {
        id: "with-icon",
        title: "With icon",
        description: "Icons pick up their spacing from the button's own gap.",
        code: `<Button variant="outline"><MailIcon /> Email</Button>
<Button variant="secondary"><StarIcon /> Star</Button>`,
        Component: () => (
          <>
            <Button variant="outline">
              <MailIcon /> Email
            </Button>
            <Button variant="secondary">
              <StarIcon /> Star
            </Button>
          </>
        ),
      },
      {
        id: "loading",
        title: "Loading",
        description: "Render a Spinner inside the button to show a pending action.",
        code: `<Button disabled><Spinner /> Saving</Button>`,
        Component: () => (
          <>
            <Button disabled>
              <Spinner /> Saving
            </Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
          </>
        ),
      },
    ],
  },
  {
    name: "button-group",
    title: "Button Group",
    description: "Groups related buttons together with shared borders and radii.",
    category: "Forms",
    usage: `import { ButtonGroup } from "@/design-system/components/button-group"

<ButtonGroup>
  <Button variant="outline">Copy</Button>
  <Button variant="outline">Share</Button>
</ButtonGroup>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<ButtonGroup>
  <Button variant="outline">Archive</Button>
  <Button variant="outline">Report</Button>
  <Button variant="outline">Snooze</Button>
</ButtonGroup>`,
        Component: () => (
          <ButtonGroup>
            <Button variant="outline">Archive</Button>
            <Button variant="outline">Report</Button>
            <Button variant="outline">Snooze</Button>
          </ButtonGroup>
        ),
      },
      {
        id: "with-text",
        title: "With text and separator",
        code: `<ButtonGroup>
  <ButtonGroupText>https://</ButtonGroupText>
  <Input placeholder="minder.ops" />
  <ButtonGroupSeparator />
  <Button variant="outline"><CopyIcon /></Button>
</ButtonGroup>`,
        Component: () => (
          <ButtonGroup>
            <ButtonGroupText>https://</ButtonGroupText>
            <Input placeholder="minder.ops" className="w-40" />
            <ButtonGroupSeparator />
            <Button variant="outline" size="icon" aria-label="Copy">
              <CopyIcon />
            </Button>
          </ButtonGroup>
        ),
      },
      {
        id: "vertical",
        title: "Vertical",
        code: `<ButtonGroup orientation="vertical">
  <Button variant="outline"><BoldIcon /></Button>
  <Button variant="outline"><ItalicIcon /></Button>
  <Button variant="outline"><UnderlineIcon /></Button>
</ButtonGroup>`,
        Component: () => (
          <ButtonGroup orientation="vertical">
            <Button variant="outline" size="icon" aria-label="Bold">
              <BoldIcon />
            </Button>
            <Button variant="outline" size="icon" aria-label="Italic">
              <ItalicIcon />
            </Button>
            <Button variant="outline" size="icon" aria-label="Underline">
              <UnderlineIcon />
            </Button>
          </ButtonGroup>
        ),
      },
    ],
  },
  {
    name: "input",
    title: "Input",
    description: "Displays a form input field.",
    category: "Forms",
    usage: `import { Input } from "@/design-system/components/input"

<Input type="email" placeholder="Email" />`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Input type="email" placeholder="Email" />`,
        Component: () => <Input type="email" placeholder="Email" className="max-w-xs" />,
      },
      {
        id: "with-label",
        title: "With label",
        code: `<Label htmlFor="workspace">Workspace</Label>
<Input id="workspace" placeholder="Minder Ops" />`,
        Component: () => (
          <div className="grid w-full max-w-xs gap-2">
            <Label htmlFor="demo-workspace">Workspace</Label>
            <Input id="demo-workspace" placeholder="Minder Ops" />
          </div>
        ),
      },
      {
        id: "states",
        title: "States",
        code: `<Input placeholder="Disabled" disabled />
<Input placeholder="Invalid" aria-invalid />`,
        Component: () => (
          <div className="grid w-full max-w-xs gap-3">
            <Input placeholder="Disabled" disabled />
            <Input placeholder="Invalid" aria-invalid defaultValue="not-an-email" />
            <Input type="file" />
          </div>
        ),
      },
    ],
  },
  {
    name: "input-group",
    title: "Input Group",
    description: "Attaches icons, text, or buttons to the edges of an input.",
    category: "Forms",
    usage: `import { InputGroup, InputGroupAddon, InputGroupInput } from "@/design-system/components/input-group"

<InputGroup>
  <InputGroupInput placeholder="Search" />
  <InputGroupAddon><SearchIcon /></InputGroupAddon>
</InputGroup>`,
    demos: [
      {
        id: "default",
        title: "Addons",
        code: `<InputGroup>
  <InputGroupInput placeholder="Search components…" />
  <InputGroupAddon><SearchIcon /></InputGroupAddon>
</InputGroup>

<InputGroup>
  <InputGroupInput placeholder="minder" />
  <InputGroupAddon align="inline-end"><InputGroupText>.ops</InputGroupText></InputGroupAddon>
</InputGroup>`,
        Component: () => (
          <div className="grid w-full max-w-sm gap-3">
            <InputGroup>
              <InputGroupInput placeholder="Search components…" />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>
            <InputGroup>
              <InputGroupInput placeholder="minder" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>.ops</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </div>
        ),
      },
      {
        id: "textarea",
        title: "With a button",
        code: `<InputGroup>
  <InputGroupTextarea placeholder="Ask the agent…" />
  <InputGroupAddon align="block-end">
    <InputGroupButton variant="default" className="ml-auto">Send</InputGroupButton>
  </InputGroupAddon>
</InputGroup>`,
        Component: () => (
          <InputGroup className="w-full max-w-sm">
            <InputGroupTextarea placeholder="Ask the agent…" />
            <InputGroupAddon align="block-end">
              <InputGroupButton variant="default" className="ml-auto">
                Send
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ),
      },
    ],
  },
  {
    name: "input-otp",
    title: "Input OTP",
    description: "Accessible one-time-password field with copy-paste support.",
    category: "Forms",
    usage: `import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/design-system/components/input-otp"

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
  </InputOTPGroup>
</InputOTP>`,
    demos: [
      {
        id: "default",
        title: "Six digits",
        description: "Type or paste a code — the slots fill in together.",
        code: `<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>`,
        Component: () => (
          <InputOTP maxLength={6}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        ),
      },
    ],
  },
  {
    name: "textarea",
    title: "Textarea",
    description: "Displays a multi-line form field.",
    category: "Forms",
    usage: `import { Textarea } from "@/design-system/components/textarea"

<Textarea placeholder="Type your message here." />`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Textarea placeholder="Type your message here." />`,
        Component: () => (
          <Textarea placeholder="Type your message here." className="max-w-sm" />
        ),
      },
    ],
  },
  {
    name: "label",
    title: "Label",
    description: "Renders an accessible label associated with a control.",
    category: "Forms",
    usage: `import { Label } from "@/design-system/components/label"

<Label htmlFor="terms">Accept terms</Label>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Label htmlFor="terms">Accept terms and conditions</Label>`,
        Component: () => (
          <div className="flex items-center gap-2">
            <Checkbox id="demo-label-terms" />
            <Label htmlFor="demo-label-terms">Accept terms and conditions</Label>
          </div>
        ),
      },
    ],
  },
  {
    name: "checkbox",
    title: "Checkbox",
    description: "A control that can be checked, unchecked, or indeterminate.",
    category: "Forms",
    usage: `import { Checkbox } from "@/design-system/components/checkbox"

<Checkbox id="terms" />`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Checkbox id="terms" defaultChecked />
<Label htmlFor="terms">Accept terms and conditions</Label>`,
        Component: () => (
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Checkbox id="demo-cb-1" defaultChecked />
              <Label htmlFor="demo-cb-1">Accept terms and conditions</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="demo-cb-2" />
              <Label htmlFor="demo-cb-2">Send me product updates</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="demo-cb-3" disabled />
              <Label htmlFor="demo-cb-3">Disabled</Label>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    name: "radio-group",
    title: "Radio Group",
    description: "A set of checkable buttons where only one can be checked at a time.",
    category: "Forms",
    usage: `import { RadioGroup, RadioGroupItem } from "@/design-system/components/radio-group"

<RadioGroup defaultValue="comfortable">
  <RadioGroupItem value="comfortable" id="r1" />
</RadioGroup>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<RadioGroup defaultValue="comfortable">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="default" id="r1" />
    <Label htmlFor="r1">Default</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="comfortable" id="r2" />
    <Label htmlFor="r2">Comfortable</Label>
  </div>
</RadioGroup>`,
        Component: () => (
          <RadioGroup defaultValue="comfortable" className="gap-3">
            {[
              ["default", "Default"],
              ["comfortable", "Comfortable"],
              ["compact", "Compact"],
            ].map(([value, label]) => (
              <div className="flex items-center gap-2" key={value}>
                <RadioGroupItem value={value} id={`demo-radio-${value}`} />
                <Label htmlFor={`demo-radio-${value}`}>{label}</Label>
              </div>
            ))}
          </RadioGroup>
        ),
      },
    ],
  },
  {
    name: "select",
    title: "Select",
    description: "Displays a list of options for the user to pick from — triggered by a button.",
    category: "Forms",
    usage: `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/design-system/components/select"

<Select>
  <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
  <SelectContent><SelectItem value="light">Light</SelectItem></SelectContent>
</Select>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Open it — the listbox is fully keyboard navigable.",
        code: `<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select a stage" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Pipeline</SelectLabel>
      <SelectItem value="new">New</SelectItem>
      <SelectItem value="contacted">Contacted</SelectItem>
      <SelectItem value="won">Won</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>`,
        Component: () => (
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Pipeline</SelectLabel>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="demo">Demo booked</SelectItem>
                <SelectItem value="won">Won</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        ),
      },
    ],
  },
  {
    name: "native-select",
    title: "Native Select",
    description: "The platform select element, styled to match the design system.",
    category: "Forms",
    usage: `import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select"

<NativeSelect>
  <NativeSelectOption value="1">One</NativeSelectOption>
</NativeSelect>`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<NativeSelect className="w-[200px]">
  <NativeSelectOption value="new">New</NativeSelectOption>
  <NativeSelectOption value="won">Won</NativeSelectOption>
</NativeSelect>`,
        Component: () => (
          <NativeSelect className="w-[200px]" defaultValue="new">
            <NativeSelectOption value="new">New</NativeSelectOption>
            <NativeSelectOption value="contacted">Contacted</NativeSelectOption>
            <NativeSelectOption value="won">Won</NativeSelectOption>
          </NativeSelect>
        ),
      },
    ],
  },
  {
    name: "combobox",
    title: "Combobox",
    description: "An autocomplete input with a filtered popover list.",
    category: "Forms",
    usage: `import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from "@/design-system/components/combobox"

<Combobox items={items}>
  <ComboboxInput placeholder="Search…" />
  <ComboboxContent>…</ComboboxContent>
</Combobox>`,
    demos: [
      {
        id: "default",
        title: "Default",
        description: "Start typing — the list filters as you go.",
        code: `const frameworks = ["Next.js", "SvelteKit", "Nuxt", "Remix", "Astro"]

<Combobox items={frameworks}>
  <ComboboxInput placeholder="Search framework…" className="w-[240px]" />
  <ComboboxContent>
    <ComboboxEmpty>No framework found.</ComboboxEmpty>
    <ComboboxList>
      {(item: string) => (
        <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
      )}
    </ComboboxList>
  </ComboboxContent>
</Combobox>`,
        Component: () => {
          const frameworks = ["Next.js", "SvelteKit", "Nuxt", "Remix", "Astro"];
          return (
            <Combobox items={frameworks}>
              <ComboboxInput placeholder="Search framework…" className="w-[240px]" />
              <ComboboxContent>
                <ComboboxEmpty>No framework found.</ComboboxEmpty>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item}>
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          );
        },
      },
    ],
  },
  {
    name: "switch",
    title: "Switch",
    description: "A control that toggles between on and off.",
    category: "Forms",
    usage: `import { Switch } from "@/design-system/components/switch"

<Switch id="airplane-mode" />`,
    demos: [
      {
        id: "default",
        title: "Default",
        code: `<Switch id="alerts" defaultChecked />
<Label htmlFor="alerts">Deployment alerts</Label>`,
        Component: () => (
          <div className="grid gap-3">
            <div className="flex items-center gap-2">
              <Switch id="demo-switch-1" defaultChecked />
              <Label htmlFor="demo-switch-1">Deployment alerts</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="demo-switch-2" disabled />
              <Label htmlFor="demo-switch-2">Disabled</Label>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    name: "slider",
    title: "Slider",
    description: "An input where the user selects a value from within a range.",
    category: "Forms",
    usage: `import { Slider } from "@/design-system/components/slider"

<Slider defaultValue={[50]} max={100} step={1} />`,
    demos: [
      {
        id: "default",
        title: "Single and range",
        code: `<Slider defaultValue={[50]} max={100} step={1} />
<Slider defaultValue={[25, 75]} max={100} step={1} />`,
        Component: () => (
          <div className="grid w-full max-w-sm gap-6">
            <Slider defaultValue={[50]} max={100} step={1} />
            <Slider defaultValue={[25, 75]} max={100} step={1} />
          </div>
        ),
      },
    ],
  },
  {
    name: "toggle",
    title: "Toggle",
    description: "A two-state button that can be on or off.",
    category: "Forms",
    usage: `import { Toggle } from "@/design-system/components/toggle"

<Toggle aria-label="Toggle bold"><BoldIcon /></Toggle>`,
    demos: [
      {
        id: "default",
        title: "Variants",
        code: `<Toggle aria-label="Bold"><BoldIcon /></Toggle>
<Toggle variant="outline" aria-label="Italic"><ItalicIcon /></Toggle>`,
        Component: () => (
          <>
            <Toggle aria-label="Bold">
              <BoldIcon />
            </Toggle>
            <Toggle variant="outline" aria-label="Italic">
              <ItalicIcon />
            </Toggle>
            <Toggle variant="outline" disabled aria-label="Underline">
              <UnderlineIcon />
            </Toggle>
          </>
        ),
      },
    ],
  },
  {
    name: "toggle-group",
    title: "Toggle Group",
    description: "A set of two-state buttons that can be toggled on or off together.",
    category: "Forms",
    usage: `import { ToggleGroup, ToggleGroupItem } from "@/design-system/components/toggle-group"

<ToggleGroup type="multiple">
  <ToggleGroupItem value="bold"><BoldIcon /></ToggleGroupItem>
</ToggleGroup>`,
    demos: [
      {
        id: "default",
        title: "Multiple and single",
        code: `<ToggleGroup type="multiple" variant="outline">
  <ToggleGroupItem value="bold"><BoldIcon /></ToggleGroupItem>
  <ToggleGroupItem value="italic"><ItalicIcon /></ToggleGroupItem>
  <ToggleGroupItem value="underline"><UnderlineIcon /></ToggleGroupItem>
</ToggleGroup>`,
        Component: () => (
          <div className="grid gap-4">
            <ToggleGroup type="multiple" variant="outline" defaultValue={["bold"]}>
              <ToggleGroupItem value="bold" aria-label="Bold">
                <BoldIcon />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <ItalicIcon />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <UnderlineIcon />
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup type="single" defaultValue="week">
              <ToggleGroupItem value="day">Day</ToggleGroupItem>
              <ToggleGroupItem value="week">Week</ToggleGroupItem>
              <ToggleGroupItem value="month">Month</ToggleGroupItem>
            </ToggleGroup>
          </div>
        ),
      },
    ],
  },
  {
    name: "field",
    title: "Field",
    description: "Layout primitives for labels, controls, descriptions, and errors.",
    category: "Forms",
    usage: `import { Field, FieldLabel, FieldDescription } from "@/design-system/components/field"

<Field>
  <FieldLabel htmlFor="name">Name</FieldLabel>
  <Input id="name" />
  <FieldDescription>Shown on invoices.</FieldDescription>
</Field>`,
    demos: [
      {
        id: "default",
        title: "Field set",
        code: `<FieldSet>
  <FieldLegend>Workspace</FieldLegend>
  <FieldGroup>
    <Field>
      <FieldLabel htmlFor="ws-name">Name</FieldLabel>
      <Input id="ws-name" placeholder="Minder Ops" />
      <FieldDescription>Shown to everyone in the workspace.</FieldDescription>
    </Field>
    <FieldSeparator />
    <Field orientation="horizontal">
      <Switch id="ws-alerts" defaultChecked />
      <FieldContent>
        <FieldTitle>Deployment alerts</FieldTitle>
        <FieldDescription>Notify the channel on every release.</FieldDescription>
      </FieldContent>
    </Field>
  </FieldGroup>
</FieldSet>`,
        Component: () => (
          <FieldSet className="w-full max-w-sm">
            <FieldLegend>Workspace</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="demo-ws-name">Name</FieldLabel>
                <Input id="demo-ws-name" placeholder="Minder Ops" />
                <FieldDescription>Shown to everyone in the workspace.</FieldDescription>
              </Field>
              <FieldSeparator />
              <Field orientation="horizontal">
                <Switch id="demo-ws-alerts" defaultChecked />
                <FieldContent>
                  <FieldTitle>Deployment alerts</FieldTitle>
                  <FieldDescription>Notify the channel on every release.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </FieldSet>
        ),
      },
      {
        id: "invalid",
        title: "Invalid",
        code: `<Field data-invalid>
  <FieldLabel htmlFor="email">Email</FieldLabel>
  <Input id="email" aria-invalid defaultValue="not-an-email" />
  <FieldError errors={[{ message: "Enter a valid email address." }]} />
</Field>`,
        Component: () => (
          <Field data-invalid className="w-full max-w-sm">
            <FieldLabel htmlFor="demo-field-email">Email</FieldLabel>
            <Input id="demo-field-email" aria-invalid defaultValue="not-an-email" />
            <FieldError errors={[{ message: "Enter a valid email address." }]} />
          </Field>
        ),
      },
    ],
  },
  {
    name: "form",
    title: "Form",
    description: "react-hook-form bindings with accessible labels, descriptions, and messages.",
    category: "Forms",
    usage: `import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/design-system/components/form"

const form = useForm({ resolver: zodResolver(schema) })`,
    demos: [
      {
        id: "default",
        title: "Validated form",
        description: "Submit it empty — validation, focus, and messaging are wired up.",
        code: `const schema = z.object({
  username: z.string().min(2, "At least 2 characters."),
})

function ProfileForm() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { username: "" } })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl><Input placeholder="minder" {...field} /></FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}`,
        Component: () => <ProfileFormDemo />,
      },
    ],
  },
  {
    name: "calendar",
    title: "Calendar",
    description: "A date field component built on React DayPicker.",
    category: "Forms",
    usage: `import { Calendar } from "@/design-system/components/calendar"

<Calendar mode="single" selected={date} onSelect={setDate} />`,
    demos: [
      {
        id: "default",
        title: "Single date",
        description: "Pick a day — arrow keys move through the grid.",
        code: `const [date, setDate] = React.useState<Date | undefined>(new Date())

<Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />`,
        Component: () => <CalendarDemo />,
      },
    ],
  },
];

const profileSchema = z.object({
  username: z.string().min(2, { message: "At least 2 characters." }),
});

function ProfileFormDemo() {
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: "" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => setSubmitted(values.username))}
        className="w-full max-w-sm space-y-6"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="minder" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-3">
          <Button type="submit">Submit</Button>
          {submitted ? (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckIcon className="size-4" /> Saved “{submitted}”
            </span>
          ) : null}
        </div>
      </form>
    </Form>
  );
}

function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 7, 22));
  return (
    <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
  );
}
