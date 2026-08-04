"use client";

export interface DatenschutzCheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  showError?: boolean;
}

export function DatenschutzCheckbox({
  checked,
  onChange,
  showError = false,
}: DatenschutzCheckboxProps) {
  return (
    <div className="datenschutz-wrap">
      <label className="datenschutz-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="datenschutz-checkbox"
        />
        <span className="datenschutz-text">
          Ich habe die{" "}
          <a
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="datenschutz-link"
          >
            Datenschutzerklärung
          </a>{" "}
          gelesen und stimme der Verarbeitung meiner Daten zur Bearbeitung
          meiner Anfrage zu.
        </span>
      </label>
      {showError ? (
        <p className="field-error">
          Bitte stimme der Datenschutzerklärung zu um fortzufahren.
        </p>
      ) : null}
    </div>
  );
}
