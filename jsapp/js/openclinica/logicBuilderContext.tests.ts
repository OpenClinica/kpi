import chai from 'chai'
import { EXCLUDED_COLUMNS, SENT_COLUMNS, buildFormContext, parseWidthToken, readItemName } from './logicBuilderContext'

// Minimal Backbone/xlform fakes. `columns` are RowDetail values (row.get(col).get('value'));
// getValue mirrors them for the name reader. A select row answers _isSelectQuestion() and hands
// out its choice list via getList(), whose options.models are Backbone models where get('name')
// is the choice VALUE, get('label') its label, get('image') its image filename. A row with
// `children` is a group: it has forEachRow (how the serializer recognises groups) and rows.models.
type Stored = string | string[] | boolean
interface FakeRowSpec {
  columns?: Record<string, Stored>
  typeId?: string
  select?: Array<{ name: string; label: string; image?: string }>
  children?: any[]
  repeat?: boolean
  error?: boolean
}

function fakeRow(spec: FakeRowSpec): any {
  const columns = spec.columns || {}
  const row: any = {
    get: (col: string) => {
      if (col === 'type' && spec.typeId !== undefined) {
        return { get: (k: string) => (k === 'typeId' ? spec.typeId : k === 'value' ? columns.type : undefined) }
      }
      return col in columns ? { get: (k: string) => (k === 'value' ? columns[col] : undefined) } : undefined
    },
    getValue: (k: string) => {
      const v = columns[k]
      return Array.isArray(v) ? v[0] : (v ?? '')
    },
    _isSelectQuestion: () => Boolean(spec.select),
    getList: () =>
      spec.select
        ? {
            options: {
              models: spec.select.map((o) => ({ get: (k: string) => (o as Record<string, string | undefined>)[k] })),
            },
          }
        : undefined,
    isError: () => Boolean(spec.error),
  }
  if (spec.children) {
    row.forEachRow = () => {}
    row.rows = { models: spec.children }
    row._isRepeat = () => Boolean(spec.repeat)
  }
  return row
}

/** Wire getSurvey() on every row (recursively) to a survey holding `rows` at its top level. */
function surveyOf(rows: any[]): void {
  const survey = { rows: { models: rows } }
  const attach = (r: any) => {
    r.getSurvey = () => survey
    for (const child of r.rows?.models || []) attach(child)
  }
  rows.forEach(attach)
}

const q = (name: string, extra: FakeRowSpec = {}) =>
  fakeRow({ ...extra, columns: { name, type: 'text', ...(extra.columns || {}) } })

describe('buildFormContext (P1.5)', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('serialises every row in form order, nested under its group, target marked (AC1, AC5, AC6)', () => {
    const weight = q('WEIGHT', { columns: { type: 'decimal', label: 'Weight (kg)' } })
    const inner = fakeRow({ columns: { name: 'INNER', type: 'group', label: 'Inner' }, children: [weight] })
    const vitals = fakeRow({ columns: { name: 'VITALS', type: 'group', label: 'Vitals' }, children: [inner] })
    const bmi = q('BMI', { columns: { type: 'decimal', label: 'BMI', calculation: '${WEIGHT} div 2' } })
    surveyOf([vitals, bmi])
    chai.expect(buildFormContext(weight)).to.deep.equal({
      rows: [
        {
          kind: 'group',
          name: 'VITALS',
          type: 'group',
          label: 'Vitals',
          logic: {},
          rows: [
            {
              kind: 'group',
              name: 'INNER',
              type: 'group',
              label: 'Inner',
              logic: {},
              rows: [
                { kind: 'question', name: 'WEIGHT', type: 'decimal', label: 'Weight (kg)', isTarget: true, logic: {} },
              ],
            },
          ],
        },
        { kind: 'question', name: 'BMI', type: 'decimal', label: 'BMI', logic: { calculation: '${WEIGHT} div 2' } },
      ],
    })
    chai.expect(warnSpy.mock.calls.length).to.equal(0)
  })

  it('marks the target by identity even when another row shares its name (AC6)', () => {
    const a = q('DUP')
    const b = q('DUP')
    surveyOf([a, b])
    chai.expect(buildFormContext(b).rows.map((r) => r.isTarget)).to.deep.equal([undefined, true])
  })

  it('omits every empty property and logic key (AC2–AC4)', () => {
    const row = q('A', {
      columns: { label: '', hint: '', appearance: '', readonly: '', required: '', calculation: '' },
    })
    surveyOf([row])
    chai.expect(buildFormContext(row).rows[0]).to.deep.equal({
      kind: 'question',
      name: 'A',
      type: 'text',
      isTarget: true,
      logic: {},
    })
  })

  it('reads every AC2 property and all question logic columns, stringifying a boolean read-only', () => {
    const row = q('EMAIL', {
      typeId: 'text',
      columns: {
        type: 'text',
        label: 'Email',
        hint: 'work address',
        'bind::oc:briefdescription': 'Email',
        'bind::oc:description': 'Primary contact email',
        'instance::oc:contactdata': 'email',
        appearance: 'w2 multiline',
        readonly: true,
        required: 'yes',
        relevant: "${HAS_EMAIL} = 'yes'",
        constraint: "regex(., '@')",
        constraint_message: 'Enter a valid email',
        default: 'none@example.org',
        calculation: 'lower-case(${RAW})',
        trigger: '${RAW}',
      },
    })
    surveyOf([row])
    chai.expect(buildFormContext(row).rows[0]).to.deep.equal({
      kind: 'question',
      name: 'EMAIL',
      type: 'text',
      label: 'Email',
      hint: 'work address',
      shortDisplayName: 'Email',
      description: 'Primary contact email',
      contactDataType: 'email',
      appearance: 'w2 multiline',
      width: 'w2',
      readOnly: 'true',
      isTarget: true,
      logic: {
        required: 'yes',
        relevant: "${HAS_EMAIL} = 'yes'",
        constraint: "regex(., '@')",
        constraintMessage: 'Enter a valid email',
        default: 'none@example.org',
        calculation: 'lower-case(${RAW})',
        trigger: '${RAW}',
      },
    })
  })

  it("sends read-only 'false' as a value, not an omission", () => {
    const row = q('A', { columns: { readonly: false } })
    surveyOf([row])
    chai.expect((buildFormContext(row).rows[0] as any).readOnly).to.equal('false')
  })

  it('uses the type id, dropping a trailing list name', () => {
    const withId = q('A', { typeId: 'select_one', columns: { type: 'select_one yesno' } })
    const noId = q('B', { columns: { type: 'select_multiple colors' } })
    surveyOf([withId, noId])
    chai.expect(buildFormContext(withId).rows.map((r) => r.type)).to.deep.equal(['select_one', 'select_multiple'])
  })

  it('takes the first translation of translated columns', () => {
    const row = q('A', {
      columns: { label: ['Peso', 'Weight'], hint: ['en kg', 'in kg'], constraint_message: ['Positivo', 'Positive'] },
    })
    surveyOf([row])
    const r = buildFormContext(row).rows[0] as any
    chai.expect([r.label, r.hint, r.logic.constraintMessage]).to.deep.equal(['Peso', 'en kg', 'Positivo'])
  })

  it('includes choices with an image only when one is defined (AC3)', () => {
    const row = q('P', {
      columns: { type: 'select_one' },
      select: [
        { name: 'yes', label: 'Yes' },
        { name: 'no', label: 'No', image: 'no.png' },
        { name: 'na', label: 'N/A', image: '' },
      ],
    })
    surveyOf([row])
    chai.expect((buildFormContext(row).rows[0] as any).choices).to.deep.equal([
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No', image: 'no.png' },
      { value: 'na', label: 'N/A' },
    ])
  })

  it('sends repeatCount on repeat groups only (AC4)', () => {
    const repeat = fakeRow({
      columns: { name: 'MEDS', type: 'repeat', repeat_count: '${N}', relevant: '${X}' },
      children: [],
      repeat: true,
    })
    const plain = fakeRow({ columns: { name: 'VITALS', type: 'group', repeat_count: '${N}' }, children: [] })
    const target = q('T')
    surveyOf([repeat, plain, target])
    const rows = buildFormContext(target).rows
    chai.expect(rows[0].logic).to.deep.equal({ relevant: '${X}', repeatCount: '${N}' })
    chai.expect(rows[1].logic).to.deep.equal({})
  })

  it('serialises a kobomatrix and its column rows as a group with children', () => {
    const col = q('SCORE', { columns: { type: 'integer' } })
    const matrix = fakeRow({ columns: { name: 'GRID', type: 'kobomatrix', label: 'Grid' }, children: [col] })
    surveyOf([matrix])
    chai.expect(buildFormContext(col).rows[0]).to.deep.equal({
      kind: 'group',
      name: 'GRID',
      type: 'kobomatrix',
      label: 'Grid',
      logic: {},
      rows: [{ kind: 'question', name: 'SCORE', type: 'integer', isTarget: true, logic: {} }],
    })
  })

  it('skips nameless and error rows, except a nameless target', () => {
    const nameless = fakeRow({ columns: { type: 'text' } })
    const err = q('E', { error: true })
    const target = fakeRow({ columns: { type: 'text' } })
    surveyOf([nameless, err, target])
    chai
      .expect(buildFormContext(target).rows)
      .to.deep.equal([{ kind: 'question', name: '', type: 'text', isTarget: true, logic: {} }])
  })

  it('drops a throwing row, keeps its siblings, and warns', () => {
    const hostile: any = {
      get: () => {
        throw new Error('x')
      },
      getValue: () => {
        throw new Error('x')
      },
    }
    const ok = q('OK')
    surveyOf([hostile, ok])
    chai.expect(buildFormContext(ok).rows.map((r) => r.name)).to.deep.equal(['OK'])
    chai.expect(warnSpy.mock.calls.length).to.be.above(0)
  })

  it('yields an empty form when the survey is unreachable', () => {
    chai.expect(buildFormContext(fakeRow({}))).to.deep.equal({ rows: [] })
    chai.expect(buildFormContext(undefined)).to.deep.equal({ rows: [] })
  })
})

describe('parseWidthToken (P1.5 AC2)', () => {
  it('mirrors the host width picker: highest wN token wins, leading zeros ignored', () => {
    chai.expect(parseWidthToken('w2 w4')).to.equal('w4')
    chai.expect(parseWidthToken('field-list')).to.equal('')
    chai.expect(parseWidthToken('w14')).to.equal('w14')
    chai.expect(parseWidthToken('w01')).to.equal('')
    chai.expect(parseWidthToken('')).to.equal('')
  })
})

describe('readItemName (P1.2)', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('reads the name off getValue', () => {
    chai.expect(readItemName(q('BMI'))).to.equal('BMI')
    chai.expect(warnSpy.mock.calls.length).to.equal(0)
  })

  it('falls back to the name detail model when getValue yields nothing', () => {
    const row = fakeRow({ columns: { name: 'PREGNANT' } })
    row.getValue = () => ''
    chai.expect(readItemName(row)).to.equal('PREGNANT')
  })

  it("is '' when neither path yields a name", () => {
    chai.expect(readItemName(fakeRow({}))).to.equal('')
    chai.expect(readItemName({})).to.equal('')
  })

  it("is '' and warns when the getValue read throws", () => {
    const hostile = {
      getValue: () => {
        throw new Error('x')
      },
      get: () => ({ get: () => 'NOT_REACHED' }),
    }
    chai.expect(readItemName(hostile)).to.equal('')
    chai.expect(warnSpy.mock.calls.length).to.be.above(0)
  })
})
