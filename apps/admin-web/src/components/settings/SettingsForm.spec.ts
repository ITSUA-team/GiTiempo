import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import SettingsForm from './SettingsForm.vue';

const AutoCompleteStub = {
	props: [
		'completeOnFocus',
		'dropdown',
		'forceSelection',
		'inputId',
		'invalid',
		'minLength',
		'modelValue',
		'optionLabel',
		'pt',
		'suggestions',
	],
	emits: ['complete', 'update:modelValue'],
	template: `
		<div>
			<input
				:id="inputId"
				:aria-invalid="invalid ? 'true' : undefined"
				:class="[$attrs.class, pt?.pcInputText?.root?.class]"
				:data-complete-on-focus="completeOnFocus === false || completeOnFocus === undefined ? 'false' : 'true'"
				:data-force-selection="forceSelection === false || forceSelection === undefined ? 'false' : 'true'"
				:data-min-length="String(minLength)"
				:data-pt-dropdown-class="pt?.dropdown?.class ?? ''"
				:data-pt-root-class="pt?.root?.class ?? ''"
				:value="modelValue?.[optionLabel] ?? ''"
				@focus="$emit('complete', { query: '' })"
			/>
			<button
				v-for="option in suggestions"
				:key="option.value"
				:data-testid="inputId + '-option-' + option.value"
				type="button"
				@click="$emit('update:modelValue', option)"
			>
				{{ option[optionLabel] }}
			</button>
		</div>
	`,
};

const SelectStub = {
	emits: ['update:modelValue'],
	props: [
		'inputId',
		'invalid',
		'modelValue',
		'optionLabel',
		'optionValue',
		'options',
	],
	template: `
		<select
			:id="inputId"
			:aria-invalid="invalid ? 'true' : undefined"
			:class="$attrs.class"
			:value="modelValue"
			@change="$emit('update:modelValue', $event.target.value)"
		>
			<option
				v-for="option in options"
				:key="option[optionValue]"
				:value="option[optionValue]"
			>
				{{ option[optionLabel] }}
			</option>
		</select>
	`,
};

const InputTextStub = {
	emits: ['update:modelValue'],
	props: ['disabled', 'id', 'modelValue'],
	template:
		'<input :id="id" :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
};

const InputNumberStub = {
	emits: ['update:modelValue'],
	props: ['inputId', 'modelValue'],
	template:
		'<input :id="inputId" :value="modelValue ?? \'\'" @input="$emit(\'update:modelValue\', $event.target.value ? Number($event.target.value) : null)" />',
};

const ButtonStub = {
	emits: ['click'],
	props: ['disabled', 'label', 'type'],
	template:
		'<button :disabled="disabled" :type="type || \'button\'" @click="$emit(\'click\', $event)">{{ label }}</button>',
};

const FormStub = defineComponent({
	emits: ['submit'],
	setup(_, { emit, expose }) {
		function submit(): void {
			emit('submit', { valid: true, values: {} });
		}

		expose({ submit });

		return { submit };
	},
	template: '<form @submit.prevent="submit"><slot /></form>',
});

const stubs = {
	Button: ButtonStub,
	Form: FormStub,
	InputNumber: InputNumberStub,
	InputText: InputTextStub,
	Message: { template: '<small><slot /></small>' },
	AutoComplete: AutoCompleteStub,
	Select: SelectStub,
	SurfaceCard: { template: '<section><slot /></section>' },
};

function createProps(overrides: Record<string, unknown> = {}) {
	return {
		canSave: true,
		currency: 'USD',
		currencyOptions: [
			{ label: 'USD', value: 'USD' },
			{ label: 'EUR', value: 'EUR' },
		],
		defaultHourlyRate: 120,
		fieldErrors: {},
		isDirty: true,
		saving: false,
		timeZone: 'UTC',
		timeZoneOptions: [
			{ label: 'UTC', value: 'UTC' },
			{ label: 'Europe/Kyiv', value: 'Europe/Kyiv' },
		],
		workspaceName: 'GiTiempo Studio',
		...overrides,
	};
}

describe('SettingsForm', () => {
	it('renders the time zone selector below the rate and currency row', async () => {
		const wrapper = mount(SettingsForm, {
			global: { stubs },
			props: createProps(),
		});

		const timeZone = wrapper.get<HTMLInputElement>('#settings-time-zone');

		await timeZone.trigger('focus');

		expect(wrapper.get('label[for="settings-time-zone"]').text()).toBe(
			'Time zone',
		);
		expect(timeZone.classes()).toContain('w-full');
		expect(timeZone.classes()).toContain('border-0');
		expect(timeZone.attributes('data-pt-root-class')).toContain('h-[38px]');
		expect(timeZone.attributes('data-pt-root-class')).toContain('border-divider');
		expect(timeZone.attributes('data-pt-dropdown-class')).toContain('bg-transparent');
		expect(timeZone.attributes('data-force-selection')).toBe('true');
		expect(timeZone.attributes('data-complete-on-focus')).toBe('true');
		expect(wrapper.text()).toContain('UTC');
		expect(wrapper.text()).toContain('Europe/Kyiv');
	});

	it('emits time zone updates from the selector', async () => {
		const wrapper = mount(SettingsForm, {
			global: { stubs },
			props: createProps(),
		});

		await wrapper.get('#settings-time-zone').trigger('focus');
		await wrapper
			.get('[data-testid="settings-time-zone-option-Europe/Kyiv"]')
			.trigger('click');

		expect(wrapper.emitted('update:timeZone')).toEqual([['Europe/Kyiv']]);
	});

	it('renders time zone validation feedback through the existing error pattern', () => {
		const wrapper = mount(SettingsForm, {
			global: { stubs },
			props: createProps({
				fieldErrors: { timeZone: 'Invalid time zone' },
			}),
		});

		expect(wrapper.get('#settings-time-zone').attributes('aria-invalid')).toBe(
			'true',
		);
		expect(wrapper.text()).toContain('Invalid time zone');
	});

	it('keeps save and cancel controlled by dirty and save state', async () => {
		const wrapper = mount(SettingsForm, {
			global: { stubs },
			props: createProps({ canSave: false, isDirty: false }),
		});

		const buttons = wrapper.findAll('button');
		const cancel = buttons.find((button) => button.text() === 'Cancel');
		const save = buttons.find((button) => button.text() === 'Save Settings');

		expect(cancel?.attributes('disabled')).toBeDefined();
		expect(save?.attributes('disabled')).toBeDefined();

		await wrapper.setProps({ canSave: true, isDirty: true });
		await cancel?.trigger('click');
		await save?.trigger('click');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
		expect(wrapper.emitted('save')).toHaveLength(1);
	});

	it('submits workspace settings through the form wrapper', async () => {
		const wrapper = mount(SettingsForm, {
			global: { stubs },
			props: createProps(),
		});

		await wrapper.get('form').trigger('submit');

		expect(wrapper.emitted('save')).toHaveLength(1);
	});

	it('keeps projected cards outside the workspace settings form', () => {
		const wrapper = mount(SettingsForm, {
			global: { stubs },
			props: createProps(),
			slots: {
				'after-card': '<section data-testid="after-card">GitHub card</section>',
			},
		});

		expect(wrapper.get('#settings-workspace-name').element.closest('form')).not.toBeNull();
		expect(wrapper.get('[data-testid="after-card"]').element.closest('form')).toBeNull();
	});
});
