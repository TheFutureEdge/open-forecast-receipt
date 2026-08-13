# Forecaster identity and execution model

Status: current Open Forecast Library design contract

## Core distinction

Not every node in the Open Forecast Library knowledge graph represents an
independently existing real-world entity.

| Scope | Examples | External identity links |
| --- | --- | --- |
| `global` | PepsiCo, an active listed security, Future Edge Group FZE, a verified human forecaster | May use governed Wikidata, official website, Wikipedia, or other `sameAs` links |
| `platform` | iPulse AI Research team, an iPulse AI forecaster profile | Uses a stable OFL/iPulse identifier; normally has no external `sameAs` |
| `configuration` | Analyst mode, task configuration, subject assignment | Identified by the source configuration ID and version; never presented as a person or organization |
| `event` | One forecast execution, one forecast receipt, one proof | Identified by immutable forecast, receipt, and proof identifiers |

An AI forecaster profile named after or inspired by a known person is a
`platform` entity. It must not use the namesake person's Wikidata ID, Person
entity, image rights, or `sameAs` links. A genuinely verified human forecaster
may be linked to a separate `global` Person entity.

## iPulse AI mapping

```text
Publisher organization
  Future Edge Group FZE
    -> product/team: iPulse AI Research
      -> forecaster profile: ai_analysts.analyst_id
        -> persona: analyst_personas.persona_id
        -> exact model specification/version
        -> task configuration: ai_task_configs.task_config_id
          -> mode: ai_analyst_modes.analyst_mode_id
          -> prompt, input, output, tools, horizon and cadence
          -> subject assignment: xref_subject_task_config_charging.xref_id
            -> forecast execution: forecast_id + batch/run time
              -> Open Forecast Receipt
                -> optional blockchain proof
```

### Identity rules

1. `analyst_id` is the stable iPulse forecaster-profile ID and maps directly to
   `forecasterProfileId` in OFL. The analyst definition includes its persona,
   archetype/investment framework, and exact model specification/version. For
   example, **Ray Dalio AI on Gemini 3.1 Pro** is one complete iPulse AI
   forecaster profile; "Ray Dalio AI" alone is only its persona-facing label.
2. Mode is not part of forecaster identity. The same forecaster profile may run
   in THINKER, RESEARCHER, SCHOLAR, or future modes.
3. A task configuration is the reusable execution definition. It binds the
   already model-specific forecaster profile to a mode and the relevant prompt,
   API/runtime settings, tools, input and output formats, horizon, cadence, and
   other configuration. It must not silently replace the model that defines the
   analyst. A different model specification/version requires a distinct or
   explicitly versioned analyst profile.
4. An xref record is a reusable assignment of a subject/entity to a task
   configuration. It is not an individual forecast.
5. A forecast is one execution output from an assignment in a particular batch
   or run. It receives its own forecast ID and receipt.
6. Review belongs to a forecast or receipt, not permanently to the forecaster.

## Public forecaster profile projection

```json
{
  "forecasterProfileId": "aianalyst_4611895e-1186-5dae-abe1-a9ee8d44ca65",
  "entityScope": "platform",
  "type": "ai_forecaster_profile",
  "displayName": "Ray Dalio AI on Gemini 3.1 Pro",
  "personaLabel": "Ray Dalio AI",
  "publisherOrganization": {
    "organizationId": "oflorg_future_edge_group_fze",
    "name": "Future Edge Group FZE"
  },
  "publisherTeam": {
    "teamId": "oflteam_ipulse_ai_research",
    "name": "iPulse AI Research",
    "product": "iPulse AI"
  },
  "sourceProfile": {
    "sourceSystem": "iPulse AI prediction architecture v2",
    "sourceType": "ai_analyst",
    "analystId": "aianalyst_4611895e-1186-5dae-abe1-a9ee8d44ca65"
  },
  "model": {
    "specId": "aimodelspec_56ff6ad1-8bd7-54ae-ad74-14ed80c1721a",
    "versionId": "aimodelversion_616fd1ac-ba85-575c-846d-6c913ba919b3",
    "name": "Gemini 3.1 Pro",
    "provider": "Google"
  },
  "modes": ["RESEARCHER", "THINKER"],
  "taskConfigurationIds": ["taskconfig_..."],
  "subjectAssignmentIds": ["xrefsubjtskconf_..."],
  "sameAs": []
}
```

The public profile is an index. Each individual forecast receipt freezes the
exact forecaster, model, mode, task configuration, input/output lineage, review,
and temporal boundaries used for that forecast.
