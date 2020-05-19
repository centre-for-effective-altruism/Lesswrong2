import React from 'react';
import { hookToHoc } from '../../lib/hocUtils';

export const MessageContext = React.createContext<WithMessagesProps|null>(null);

// Hook/HoC that provides access to flash messages stored in context
export const useMessages = (): WithMessagesProps => React.useContext(MessageContext)!;
export const withMessages = hookToHoc(useMessages);
export default withMessages;
