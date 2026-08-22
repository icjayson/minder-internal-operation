"use client";

import * as React from "react";
import { CalendarIcon, MailIcon, SearchIcon, UploadIcon } from "lucide-react";

import { Button } from "@/design-system/components/button";
import { Calendar } from "@/design-system/components/calendar";
import { Checkbox } from "@/design-system/components/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/design-system/components/field";
import { Input } from "@/design-system/components/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/design-system/components/input-group";
import { Label } from "@/design-system/components/label";
import { NativeSelect, NativeSelectOption } from "@/design-system/components/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/design-system/components/popover";
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

import { Spec, SpecGrid, generalStyles as styles } from "./shell";

function DatePickerSpec() {
  const [date, setDate] = React.useState<Date | undefined>(new Date(2026, 7, 22));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarIcon />
          {date ? date.toLocaleDateString("en-US", { dateStyle: "medium" }) : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  );
}

export function FormsSection() {
  return (
    <SpecGrid>
      <Spec label="Button" source="components/button" wide>
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className={styles.row}>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Email">
            <MailIcon />
          </Button>
          <Button disabled>
            <Spinner /> Loading
          </Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </div>
      </Spec>

      <Spec label="Text input" source="components/input">
        <div className={styles.stack}>
          <div className={styles.field}>
            <Label htmlFor="gs-email">Work email</Label>
            <Input id="gs-email" type="email" defaultValue="name@company.com" />
          </div>
          <div className={styles.field}>
            <Label htmlFor="gs-ws">Workspace</Label>
            <Input id="gs-ws" placeholder="Acme workspace" />
          </div>
          <Input placeholder="Disabled" disabled />
        </div>
      </Spec>

      <Spec label="Textarea" source="components/textarea">
        <Textarea placeholder="Write something…" />
      </Spec>

      <Spec label="Select / Dropdown" source="components/select · native-select">
        <div className={styles.stack}>
          <Select>
            <SelectTrigger>
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
          </Select>
          <NativeSelect defaultValue="11-50">
            <NativeSelectOption value="1-10">1–10 people</NativeSelectOption>
            <NativeSelectOption value="11-50">11–50 people</NativeSelectOption>
            <NativeSelectOption value="51-100">51–100 people</NativeSelectOption>
          </NativeSelect>
        </div>
      </Spec>

      <Spec label="Checkbox" source="components/checkbox">
        <div className={styles.stack}>
          <div className={styles.inline}>
            <Checkbox id="gs-cb1" defaultChecked />
            <Label htmlFor="gs-cb1">Accept terms and conditions</Label>
          </div>
          <div className={styles.inline}>
            <Checkbox id="gs-cb2" />
            <Label htmlFor="gs-cb2">Send product updates</Label>
          </div>
          <div className={styles.inline}>
            <Checkbox id="gs-cb3" disabled />
            <Label htmlFor="gs-cb3">Disabled</Label>
          </div>
        </div>
      </Spec>

      <Spec label="Radio button" source="components/radio-group">
        <RadioGroup defaultValue="comfortable" className={styles.stack}>
          {[
            ["default", "Default"],
            ["comfortable", "Comfortable"],
            ["compact", "Compact"],
          ].map(([value, label]) => (
            <div className={styles.inline} key={value}>
              <RadioGroupItem value={value} id={`gs-r-${value}`} />
              <Label htmlFor={`gs-r-${value}`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </Spec>

      <Spec label="Switch / Toggle" source="components/switch">
        <div className={styles.stack}>
          <div className={styles.inline}>
            <Switch id="gs-sw1" defaultChecked />
            <Label htmlFor="gs-sw1">Deployment alerts</Label>
          </div>
          <div className={styles.inline}>
            <Switch id="gs-sw2" />
            <Label htmlFor="gs-sw2">Weekly digest</Label>
          </div>
        </div>
      </Spec>

      <Spec label="Slider / Range" source="components/slider">
        <div className={styles.stack}>
          <Slider defaultValue={[50]} max={100} step={1} />
          <Slider defaultValue={[25, 75]} max={100} step={1} />
        </div>
      </Spec>

      <Spec label="Date picker" source="components/calendar + popover">
        <DatePickerSpec />
      </Spec>

      <Spec label="Search input" source="components/input-group">
        <InputGroup>
          <InputGroupInput placeholder="Search customers…" />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <InputGroupButton>Go</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Spec>

      <Spec label="File upload" source="components/input[type=file]">
        <div className={styles.stack}>
          <Input type="file" />
          <Button variant="outline">
            <UploadIcon /> Choose a file
          </Button>
        </div>
      </Spec>

      <Spec label="Label, helper text, error" source="components/field">
        <div className={styles.stack}>
          <Field>
            <FieldLabel htmlFor="gs-help">Workspace name</FieldLabel>
            <Input id="gs-help" placeholder="Acme workspace" />
            <FieldDescription>Shown to everyone in the workspace.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="gs-err">Work email</FieldLabel>
            <Input id="gs-err" aria-invalid defaultValue="not-an-email" />
            <FieldError errors={[{ message: "Enter a valid email address." }]} />
          </Field>
          <Field orientation="horizontal">
            <Switch id="gs-field-switch" defaultChecked />
            <FieldContent>
              <FieldTitle>Horizontal field</FieldTitle>
              <FieldDescription>Control first, text beside it.</FieldDescription>
            </FieldContent>
          </Field>
        </div>
      </Spec>
    </SpecGrid>
  );
}
