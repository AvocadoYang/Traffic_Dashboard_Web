import { CSS, Transform } from '@dnd-kit/utilities';

/**
 * Returns the style object for a Card component.
 *
 * @param transform - The transform object from useSortable.
 * @param transition - The transition value from useSortable.
 * @returns An object containing the styles.
 */
export default (
  transform: Transform | null,
  transition: string | undefined,
  _sortableId?: string
) => {
  return {
    transform: CSS.Transform.toString(transform),
    transition,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    borderTop: `5px solid #315E7D`
  };
};
