# Karpathy Guidelines

## Overview
Guidelines inspired by Andrej Karpathy's software engineering principles for AI-assisted development.

## Core Principles

### 1. Understand the Full Codebase
- Read and understand the entire relevant codebase before making changes
- Do not make assumptions about code that hasn't been read
- Trace code paths end-to-end when debugging

### 2. Verify First, Then Trust
- Always verify assumptions with actual code inspection
- Test changes in isolation before integration
- Use minimal reproducible examples for debugging

### 3. Prefer Simplicity
- Write simple, readable code over clever solutions
- Avoid premature optimization
- Favor standard library solutions over custom implementations

### 4. Systematic Debugging
- Use binary search on code to isolate issues
- Add logging and assertions rather than guessing
- Fix the root cause, not the symptom

### 5. Test-Driven Mindset
- Write tests to define expected behavior
- Use tests to document edge cases
- Regression tests for every bug fix

### 6. Context-Aware Development
- Be explicit about assumptions
- Document why, not just what
- Consider the full lifecycle of code changes

### 7. Iterative Refinement
- Make small, verifiable changes
- Review and reflect on each step
- Build complexity only as needed

## Application with AI Assistants
- Provide full context when asking for help
- Request explanations of unfamiliar patterns
- Validate AI-generated code against project standards
- Use AI for boilerplate, but review logic carefully